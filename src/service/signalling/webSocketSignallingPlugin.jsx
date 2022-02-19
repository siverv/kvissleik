import {createSignal} from 'solid-js';
import { CopyToClipboardButton } from '../../components/ui/CopyToClipboardButton';
import { RoomCodeEntry } from '../../components/ui/RoomCodeEntry';
import { RadioGroup } from '../../components/ui/RadioGroup';
import {SignallingServer} from './signallingPluginTemplate';
import {useSearchParams} from 'solid-app-router';
import {first} from 'rxjs';
import {
  generateHostKeyPair, generateKeyId,
  decryptSymmetric, encryptSymmetric,
  wrapKeyIdForHost, unwrapKeyIdForHost,
  keyIdToActualKey, hashPassword
} from '../../utils/cryptoUtils';


const protocol = import.meta.env.VITE_SAMSPILL_PROTOCOL;
const location = import.meta.env.VITE_SAMSPILL_HOST;
const samspillVersion = import.meta.env.VITE_SAMSPILL_VERSION;

// TODO?: Abstract away the actual server communication:
// That is: into a ServerConnection (WebSocketConnection, PollConnection, etc) and a SamspillSignallingServer that sends/receives from the connection.
// Unecessary, but potentially prettier? 
export class WebSocketSignallingServer extends SignallingServer {
  secure = true;
  static SIGNALLING_SERVER_ID = "WS";
  static details = {
    name: "Samspill",
    description: "WebSocket-based",
  }

  async connect(host){
    return await new Promise((resolve) => {
      this.emitEvent({type: "STATE", data: "CONNECTING"});
      if(this.webSocket){
        this.cleanup();
      }
      this.webSocket = new WebSocket(`${protocol}//${location}${host?"?host":"?join"}`);
      this.webSocket.addEventListener("open", this._onOpen);
      this.webSocket.addEventListener("close", this._onClose);
      this.webSocket.addEventListener("message", this._onMessage);
      this.resolveConnecting = resolve;
    });
  }

  _onOpen = this.onOpen.bind(this);
  onOpen(){
    this.emitEvent({type: "STATE", data: "CONNECTED"});
    this.connected = true;
    this.resolveConnecting(true);
  }

  _onClose = this.onClose.bind(this);
  onClose(){
    this.emitEvent({type: "STATE", data: "DISCONNECTED"});
    this.webSocket = null;
    this.connected = false;
  }

  _onMessage = this.onMessage.bind(this);
  async onMessage(message){
    // try {
      let {source, data} = JSON.parse(message.data);
      if(source == null){
        await this.handleMessage(null, data);
      } else {
        if(this.secure){
          let key;
          if(this.whoami === "host"){
            key = await unwrapKeyIdForHost(source, this.privateKey);
          } else {
            key = await keyIdToActualKey(this.keyId);
          }
          data = await decryptSymmetric(data.content, data.iv, key);
          data = JSON.parse(data);
        }
        this.handleMessage(source, data);
      }
    // } catch(e) {
    //   console.error(e);
    // }
  }

  async host(publicKey, settings){
    settings.password = settings.password ? await hashPassword(settings.password, publicKey) : null;
    await this.send(null, {type: "HOST", payload: {publicKey, settings, version: samspillVersion}});
  }

  async sleep(){
    await this.send(null, {type: "SLEEP"});
    this.emitEvent({type: "ROOM_STATE", data: "SLEEPING"});
  }

  async about(){
    await this.send(null, {type: "ABOUT"});
  }

  async wake(){
    await this.send(null, {type: "WAKE"});
    this.emitEvent({type: "ROOM_STATE", data: "ACTIVE"});
  }

  async quit(){
    await this.send(null, {type: "QUIT"});
    this.emitEvent({type: "ROOM_STATE", data: "NONE"});
  }

  async kick(externalId){
    await this.send(null, {type: "KICK", payload: {externalId}})
  }

  async join(code, version){
    await this.send(null, {type: "JOIN", payload: {code, version: samspillVersion}});
  }

  async handshake(externalId, name, password) {
    name = await this.encryptValue(name);
    password = password && await hashPassword(password, this.publicKey);
    await this.send(null, {type: "HANDSHAKE", payload: {externalId, name, password}});
  }

  async signal(signal, target = "host"){
    await this.send(target, {type: "SIGNAL", payload: signal});
  }

  async handleMessage(source, data){
    if(this.whoami === "host"){
      switch(data.type){
        case 'ROOM': return await this.handleRoom(data.payload);
        case 'BOUNCE': throw "Not yet implemented";
        case 'DENIED': return await this.handleDenied(data.payload);
        case 'JOINED': return await this.handleJoined(data.payload);
        case 'SIGNAL': return await this.handleSignal(source, data.payload)
      }
    } else {
      switch(data.type){
        case 'QUIT': return await this.handleQuit();
        case 'BOUNCE': throw "Not yet implemented";
        case 'HANDSHAKE': return await this.handleHandshake(data.payload);
        case 'ACCEPTED': return await this.handleAccepted(data.payload);
        case 'DENIED': return await this.handleDenied(data.payload);
        case 'SIGNAL': return await this.handleSignal(source, data.payload)
      }
    }
  }

  async withEventResponse(send, responseTypes){
    return await new Promise((resolve, reject) => {
      this.events.pipe(first(event => responseTypes.includes(event.type))).subscribe(resolve);
      send().catch(reject);
    });
  }

  async send(target, data) {
    if(target != null){
      if(this.secure){
        data = JSON.stringify(data);
        let key;
        if(target === "host"){
          key = await keyIdToActualKey(this.keyId);
        } else {
          key = await unwrapKeyIdForHost(target, this.privateKey);
        }
        let [content, iv] = await encryptSymmetric(data, key);
        data = {content, iv};
      }
    }
    this.webSocket.send(JSON.stringify({
      target,
      source: this.whoami,
      data
    }));
  }

  cleanup(){
    this.webSocket.removeEventListener("open", this._onOpen);
    this.webSocket.removeEventListener("close", this._onClose);
    this.webSocket.removeEventListener("message", this._onMessage);
    this.webSocket?.close();
  }

  async createChannel(config){
    this.config = config;
    this.whoami = "host";
    this.hidden = config.roomCodeType === "HIDDEN";
    // if(this.secure && this.hidden){
    //   this.roomKey = await generateKeyId();
    // }
    let [keys, _] = await Promise.all([
      generateHostKeyPair(this.roomKey),
      this.connect(true)
    ])
    this.privateKey = keys.privateKey;
    this.publicKey = keys.publicKey;
    const settings = {
      type: config.type,
      hidden: this.hidden,
      maxParticipants: config.maxParticipants,
      password: config.password
    };
    let response = await this.withEventResponse(
      async () => await this.host(this.publicKey, settings),
      ["ACCEPTED", "DENIED"]
    );
    if(response.type === "DENIED"){
      return false;
    }
    this.emitEvent({type: "ROOM_STATE", data: "ACTIVE"});
    return true;
  }

  async openChannel(config){
    this.config = config;
    let [keyId, _] = await Promise.all([
      generateKeyId(this.roomKey),
      this.connect(false)
    ])
    this.keyId = keyId;
    this.roomCode = config.roomCode;
    let response = await this.withEventResponse(
      async () => await this.join(config.roomCode),
      ["ACCEPTED", "DENIED"]
    );
    if(response.type === "DENIED"){
      return response.data;
    }
    this.emitEvent({type: "ROOM_STATE", data: "ACTIVE"});
    return null;
  }

  async handleRoom(room){
    this.roomCode = room.code;
    this.participants = await Promise.all(
      room.participants.map(part => this.unwrapParticipant(part))
    );
    this.emitEvent({type: "PARTICIPANTS", data: this.participants});
    this.emitEvent({type: "ACCEPTED"});
  }

  async handleDenied({reason}){
    this.emitEvent({type: "DENIED", data: {reason}});
  }

  async handleAccepted(room){
    this.type = room.type;
    this.emitEvent({type: "ACCEPTED", data: room});
  }

  handleSignal(source, signal){
    this.emitEvent({type: "SIGNAL", data: {source, signal}});
  }

  async handleJoined(participant){
    participant = await this.unwrapParticipant(participant);
    let index = this.participants.findIndex(part => part.id === participant.id);
    if(index >= 0){
      this.participants[index] = participant;
    } else {
      this.participants.push(participant);
    }
    this.emitEvent({type: "PARTICIPANTS", data: this.participants});
  }

  async unwrapParticipant(participant){
    return {
      id: participant.id,
      name: await this.decryptValue(participant.name, participant.id)
    }
  }

  async handleHandshake(handshake){
    this.publicKey = handshake.publicKey;
    let {name, password} = this.config;
    this.name = name;
    this.externalId = await wrapKeyIdForHost(this.keyId, this.publicKey);
    await this.handshake(this.externalId, name, password);
  }

  async encryptValue(value){
    if(this.secure){
      let key = await keyIdToActualKey(this.keyId);
      let [content, iv] = await encryptSymmetric(value, key);
      return {content, iv};
    } else {
      return value;
    }
  }

  async decryptValue(value, encryptedKeyId){
    if(this.secure){
      let key = await unwrapKeyIdForHost(encryptedKeyId, this.privateKey);
      return await decryptSymmetric(value.content, value.iv, key);
    } else {
      return value;
    }
  }

  getRoomCode(){
    return this.hidden ? null : this.roomCode;
  }

  getRoomLink(){
    let searchParams = new URLSearchParams();
    searchParams.set("signallingServer", this.constructor.SIGNALLING_SERVER_ID);
    searchParams.set("roomCode", this.roomCode);
    if(this.password){
      searchParams.set("hasPassword", true);
    }
    return `${window.location.origin}/play?${searchParams.toString()}`
  }
}




WebSocketSignallingServer.ParticipantConnectionInput = function({validationNotes}) {
  let initialName = localStorage.getItem("SAMSPILL_PREVIOUS_NAME")
  let [searchParams] = useSearchParams()
  let [showPassword, setShowPassword] = createSignal(searchParams.hasPassword === "true");
  return <>
    <input type="hidden" name="password_hasPassword" value={showPassword() ? "true" : "false"}/>
    <RoomCodeEntry notes={validationNotes?.roomCode} initialValue={searchParams.roomCode}/>
    <div style="margin:-1em;"/>
    {/* <div class="entry-group name">
      <label class="label" htmlFor="name-entry-input">Hello, my name is</label>
      <input id="name-entry-input" name="name" type="text" minLength={1} maxLength={20} placeholder="Jack and/or Jill" value={initialName}></input>
      <div/>
      <div>
        <button type="button" onClick={() => setMoreLetters(!moreLetters())}>
          {showPassword() ? "Is this a protected room?" : "Is this an open room?"}
        </button>
      </div>
      <b class="note">
        {validationNotes?.name}
      </b>
    </div> */}
    <div class="entry-group password">
      <div/><div>
        <button type="button" onClick={() => setShowPassword(!showPassword())}>
          {showPassword() ? "Is this an open room?" : "Is this a protected room?"}
        </button>
      </div><div/>
      <Show when={showPassword()}>
        <label class="label" htmlFor="password-entry-input">The secret word is</label>
        <input id="password-entry-input" name="password" type="password"></input>
        <div/>
        <div/>
        <b class="note">
          {validationNotes?.password}
        </b>
      </Show>
    </div>
    <div style="margin:1em;"/>
  </>;
}

WebSocketSignallingServer.ParticipantConnectionInput.parseFormData = function(formData) {
  const config = {};
  let validationNotes = null;
  let searchParams = {};
  config.roomCode = RoomCodeEntry.parseFormData(formData);
  if(config.roomCode.length < 4){
    validationNotes = {...validationNotes, roomCode: "Code is too short: needs to be at least 4 characters"};
  } else if(config.roomCode.match(/^[A-Z0-9]$/)){
    validationNotes = {...validationNotes, roomCode: "Code contains invalid characters"};
  } else {
    searchParams.roomCode = config.roomCode;
  }
  let hasPassword = formData.get("password_hasPassword") === "true";
  if(hasPassword){
    config.password = formData.get("password") || null;
  }
  config.name = formData.get("name")
  if(!config.name){
    validationNotes = {...validationNotes, name: "You need a name"}
  } else if(!config.name.match(/^.{1,20}$/)){
    validationNotes = {...validationNotes, name: "Name needs to be between 1 and 20 characters"};
  } else {
    localStorage.setItem("SAMSPILL_PREVIOUS_NAME", config.name);
  }
  return [
    config,
    validationNotes,
    searchParams
  ]
}

WebSocketSignallingServer.HostConnectionDetails = function({server}) {
  return <>
    <Show when={server.getRoomCode()}>
      {code => <h3>
          Room code is {code}
        <CopyToClipboardButton getValue={() => code}>
          copy code
        </CopyToClipboardButton>
      </h3>
      }
    </Show>
    <Show when={server.getRoomLink()}>
      {link => <div>
        <a href={link}>
          Invite players by link
        </a>
        <CopyToClipboardButton getValue={() => link}>
          copy link
        </CopyToClipboardButton>
      </div>}
    </Show>
  </>
}

WebSocketSignallingServer.HostConfigurationInput = function({validationNotes}) {
  const [isRoomCode, setIsRoomCode] = createSignal(true);
  return <>
    <div class="entry-group password">
      <label class="label" htmlFor="signallingConfig_password">Protect the room with a secret password</label>
      <input id="signallingConfig_password" name="signallingConfig_password" type="password"/>
      <div/>
      <b class="note">
        {validationNotes?.password}
      </b>
    </div>
    <div class="entry-group modes">
      <label class="label" htmlFor="signallingServerGroup">How would you like your room?</label>
      <RadioGroup name="signallingConfig_roomCodeType" initialValue="ROOM_CODE" options={[
          {value: "ROOM_CODE", label: "Room Code", description: "A 4-letter room code is all that's required to join."},
          {value: "HIDDEN", label: "Hidden Room", description: "An unguessable room code, which can be shared by link."},
      ]} onInput={ev => setIsRoomCode(ev.target.value === "ROOM_CODE")}/>
      <div/>
      <div/>
      <b class="note">
        {validationNotes?.roomCodeType}
      </b>
    </div>
    {/*<Show when={isRoomCode()}>
      <div class="entry-group code-length">
        <label class="label" htmlFor="roomCodeLength">Room Code Length</label>
        <input id="roomCodeLength" name="roomCodeLength" type="number" step="1" min="4" max="128" value="4"/>
        <div/>
        <b class="note">
          {validationNotes?.roomCodeLength}
        </b>
      </div>
    </Show>*/}
  </>
}
WebSocketSignallingServer.HostConfigurationInput.parseFormData = function(formData) {
  let validationNotes = null;
  let config = {};
  let searchParams = {};
  config.roomCodeType = formData.get("signallingConfig_roomCode");
  searchParams.roomCodeType = config.roomCodeType;

  if(config.roomCodeType === "ROOM_CODE"){
    config.roomCodeLength = parseInt(formData.get("roomCodeLength"));
    if(isNaN(config.roomCodeLength)){
      validationNotes = {...validationNotes, roomCodeLength: <>The room code length needs to be a number.</>};
    } else if(config.roomCodeLength < 4 || config.roomCodeLength > 128) {
      validationNotes = {...validationNotes, roomCodeLength: <>The room code length needs to be greater than 4.</>};
    } else {
      searchParams.roomCodeLength = config.roomCodeLength;
    }
  }
  config.password = formData.get("signallingConfig_password") || null;
  
  return [
    config,
    validationNotes,
    searchParams
  ]
}