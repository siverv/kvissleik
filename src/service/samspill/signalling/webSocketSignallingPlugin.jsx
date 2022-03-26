import {SignallingServer} from './signallingPluginTemplate';
import {
  generateHostKeyPair, generateKeyId,
  decryptSymmetric, encryptSymmetric,
  wrapKeyIdForHost, unwrapKeyIdForHost,
  keyIdToActualKey, hashValue
} from '../crypto';
import {ParticipantConnectionInput} from '../components/ParticipantConnectionInput';
import {HostConnectionDetails} from '../components/HostConnectionDetails';
import {HostConfigurationInput} from '../components/HostConfigurationInput';


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
    settings.password = settings.password ? await hashValue(settings.password, publicKey) : null;
    await this.send(null, {type: "HOST", payload: {publicKey, settings, version: samspillVersion}});
  }

  async sleep(){
    if(this.sleeping){
      return;
    }
    this.sleeping = true;
    await this.send(null, {type: "SLEEP"});
    this.emitEvent({type: "ROOM_STATE", data: "SLEEPING"});
  }

  async about(){
    await this.send(null, {type: "ABOUT"});
  }

  async wake(){
    if(!this.sleeping){
      return;
    }
    this.sleeping = false;
    await this.send(null, {type: "WAKE"});
    this.emitEvent({type: "ROOM_STATE", data: "ACTIVE"});
  }

  async quit(){
    await this.send(null, {type: "QUIT"});
    this.emitEvent({type: "ROOM_STATE", data: "NONE"});
  }

  async kick(externalId){
    let index = this.participants.findIndex(part => part.id === externalId);
    if(index >= 0){
      this.participants.splice(index, 1);
    }
    await this.send(null, {type: "KICK", payload: {externalId}})
  }

  async join(code, version){
    await this.send(null, {type: "JOIN", payload: {code, version: samspillVersion}});
  }

  async handshake(externalId, name, password) {
    let nameHash = await hashValue(name, this.publicKey);
    let encryptedName = await this.encryptValue(name);
    let hashedPassword = password && await hashValue(password, this.publicKey);
    await this.send(null, {type: "HANDSHAKE", payload: {externalId, name: encryptedName, nameHash, password: hashedPassword}});
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
    let promise = this.events.next(event => responseTypes.includes(event.type));
    send();
    return await promise;
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
    this.webSocket?.send(JSON.stringify({
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
    if(!password && handshake.hasPassword){
      password = prompt("Enter the rooms secret password:");
      if(!password){
        return this.handleDenied({reason: "NO_PASSWORD"});
      }
    }
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
    return this.roomCode;
  }

  getRoomLink(){
    let searchParams = new URLSearchParams();
    searchParams.set("signallingServer", this.constructor.SIGNALLING_SERVER_ID);
    searchParams.set("roomCode", this.roomCode);
    if(this.config.password){
      searchParams.set("hasPassword", true);
    }
    return `${window.location.origin}/play?${searchParams.toString()}`
  }
}

WebSocketSignallingServer.ParticipantConnectionInput = ParticipantConnectionInput;
WebSocketSignallingServer.HostConnectionDetails = HostConnectionDetails;
WebSocketSignallingServer.HostConfigurationInput = HostConfigurationInput;
