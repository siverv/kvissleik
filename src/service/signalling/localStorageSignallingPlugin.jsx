import {createSignal, observable, onCleanup} from 'solid-js';
import { CopyToClipboardButton } from '../../components/ui/CopyToClipboardButton';
import { RoomCodeEntry } from '../../components/ui/RoomCodeEntry';
import { RadioGroup } from '../../components/ui/RadioGroup';
import {SignallingServer} from './signallingPluginTemplate';
import {WebSocketSignallingServer} from './webSocketSignallingPlugin';
import {useSearchParams} from 'solid-app-router';
import {first} from 'rxjs';
import {generateAlphabeticalId} from '../../utils/cryptoUtils';
import {
  generateHostKeyPair, generateKeyId,
  decryptSymmetric, encryptSymmetric,
  wrapKeyIdForHost, unwrapKeyIdForHost,
  keyIdToActualKey, hashPassword
} from '../../utils/cryptoUtils';

const samspillVersion = import.meta.env.VITE_SAMSPILL_VERSION;
const roomPrefix = "SAMSPILL_ROOM";

class LocalStorageAppendLog {
  constructor(identity, logId, interval = 1000, secure=false){
    this.identity = identity;
    let date = new Date();
    let dateString = date.getFullYear()
      + date.getMonth().toString().padStart(2,0)
      + date.getDate().toString().padStart(2,0);
    this.prefix = `${roomPrefix}_${dateString}`; 
    this.logId = `${this.prefix}_${logId}`;
    this.interval = interval;
    this.offset = 0;
    this.listeners = [];
    this.pollingInterval = setInterval(this.poll.bind(this), this.interval);
    this.sleeping = false;
    this.cleanupOldRooms();
  }

  cleanupOldRooms(){
    let roomsToClean = Object.entries(localStorage)
      .map(([key]) => key)
      .filter(key => key.startsWith(roomPrefix) && key < this.prefix);
    if(roomsToClean.length > 0){
      console.info(`Cleaning up ${roomsToClean.length} room(s)`);
      roomsToClean.forEach(key => localStorage.removeItem(key));
    }
  }

  setIdentity(identity){
    this.identity = identity;
  }
  cleanup(){
    clearInterval(this.pollingInterval);
  }
  getLog(){
    return JSON.parse(localStorage.getItem(this.logId) || "[]");
  }
  poll(){
    let log = this.getLog();
    let list = log.slice(this.offset);
    if(list.length){
      this.offset += list.length;
      for(let i = 0; i < list.length; i++){
        let {target, data} = list[i];
        if(data.type === "SLEEP"){
          this.sleeping = true;
          this.emit(list[i]);
          continue;
        } else if(data.type === "WAKE"){
          this.sleeping = false;
          this.emit(list[i]);
          continue;
        }
        if(!this.sleeping){
          if(target == null || target === this.identity){
            this.emit(list[i]);
          }
        }
      }
    }
  }
  emit(entry){
    for(let listener of this.listeners){
      listener(entry);
    }
  }
  addListener(callback){
    this.listeners.push(callback);
    return () => {
      let index = this.listeners.indexOf(callback);
      if(index >= 0){
        this.listeners.splice(index, 1)
      }
    }
  }
  create(){
    localStorage.setItem(this.logId, "[]");
  }
  clear(){
    localStorage.removeItem(this.logId);
  }
  append(target, data){
    localStorage.setItem(this.logId, JSON.stringify([
      ...this.getLog(),
      {target, source: this.identity, data}
    ]));
  }
}


// Useful for testing purposes locally without a websocket-server.
// Can also be a standin for "public append logs" wrt. needs.
export class LocalStorageSignallingServer extends SignallingServer {
  secure = true;
  static SIGNALLING_SERVER_ID = "TEST";
  static details = {
    name: "Local Test",
    description: "LocalStorage-based signalling server for testing purposes. Acts like polling a public append log.",
  };


  participantMap = new Map();
  setParticipant(id, name){
    this.participantMap.set(id, {id, name});
    this.emitEvent({type: "PARTICIPANTS", data: Array.from(this.participantMap.values())});
  }

  cleanup(){
    this.appendLog.cleanup()
  }


  async hostHandshake(publicKey, settings){
    this.appendLog.create();
    this.password = settings.password ? await hashPassword(settings.password, publicKey) : null;
    await this.send(null, {type: "HOST", payload: {
      publicKey,
      settings: {
        version: samspillVersion,
        type: settings.type,
        hasPassword: Boolean(settings.password)
      }
    }});
    this.emitEvent({type: "ROOM_STATE", data: "ACTIVE"});
    this.emitEvent({type: "PARTICIPANTS", data: Array.from(this.participantMap.values())});
    this.emitEvent({type: "ACCEPTED"});
  }

  async sleep(){
    await this.send(null, {type: "SLEEP"});
    this.emitEvent({type: "ROOM_STATE", data: "SLEEPING"});
  }

  async wake(){
    await this.send(null, {type: "WAKE"});
    this.emitEvent({type: "ROOM_STATE", data: "ACTIVE"});
  }

  async quit(){
    this.appendLog.clear();
    this.emitEvent({type: "ROOM_STATE", data: "NONE"});
  }

  async accepted(target){
    await this.send(target, {type: "ACCEPTED"});
  }

  async denied(target, reasons){
    await this.send(target, {type: "DENIED", payload: reasons});
  }

  async kick(externalId){
    // TODO
  }

  async joinHandshake(externalId, name, password, signal){
    name = await this.encryptValue(name);
    password = password && await hashPassword(password, this.publicKey);
    signal = await this.encryptValue(JSON.stringify(signal));
    await this.send(null, {type: "JOIN", payload: {
      externalId,
      name,
      password,
      signal
    }});
  }

  async signal(signal, target = "host"){
    this.resolveSignal?.(signal);
    await this.send(target, {type: "SIGNAL", payload: signal});
  }

  async handleMessage({target, source, data}){
    if(target != null && this.secure){
      let key;
      if(this.whoami === "host"){
        key = await unwrapKeyIdForHost(source, this.privateKey);
      } else {
        key = await keyIdToActualKey(this.keyId);
      }
      data = await decryptSymmetric(data.content, data.iv, key);
      data = JSON.parse(data);
    }
    if(this.whoami === "host"){
      switch(data.type){
        case 'JOIN': return await this.handleJoin(data.payload);
      }
    } else {
      switch(data.type){
        case 'HOST': return await this.handleHost(data.payload);
        case 'SIGNAL': return await this.handleSignal(source, data.payload)
        case 'DENIED': return await this.handleDenied(data.payload);
        case "SLEEP": return this.emitEvent({type: "ROOM_STATE", data: "SLEEPING"});
        case "WAKE": return this.emitEvent({type: "ROOM_STATE", data: "ACTIVE"});
        case "QUIT": return this.emitEvent({type: "ROOM_STATE", data: "NONE"});
      }
    }
  }

  createRoomCode(){
    if(this.hidden){
      return generateAlphabeticalId();
    } else {
      return generateAlphabeticalId(4);
    }
  }

  async createChannel(config){
    this.whoami = "host";
    this.config = config;
    // this.secure = config.roomCodeType === "SECURE";
    this.hidden = config.roomCodeType === "HIDDEN";
    this.roomCode = this.createRoomCode();

    this.emitEvent({type: "STATE", data: "CONNECTING"});
    this.appendLog = new LocalStorageAppendLog(this.whoami, this.roomCode);
    this.appendLog.addListener(entry => this.handleMessage(entry));
    this.emitEvent({type: "STATE", data: "CONNECTED"});

    const keys = await generateHostKeyPair(this.roomKey);
    this.privateKey = keys.privateKey;
    this.publicKey = keys.publicKey;

    await this.hostHandshake(this.publicKey, {
      type: config.type,
      password: config.password
    });
    return true;
  }

  async getEventResponse(responseTypes){
    return await new Promise((resolve, reject) => {
      this.events.pipe(first(event => responseTypes.includes(event.type))).subscribe(resolve);
    });
  }

  async openChannel(config){
    this.config = config;
    this.keyId = await generateKeyId(this.roomKey);
    this.roomCode = config.roomCode;

    this.emitEvent({type: "STATE", data: "CONNECTING"});
    this.appendLog = new LocalStorageAppendLog(null, this.roomCode);
    this.appendLog.addListener(entry => this.handleMessage(entry));
    let response = await this.getEventResponse(["HANDSHAKE", "DENIED"]);
    if(response.type === "DENIED"){
      return response.data;
    }
    this.emitEvent({type: "STATE", data: "CONNECTED"});
    this.appendLog.setIdentity(this.externalId);

    let signal = await new Promise((resolve) => {
      this.resolveSignal = resolve;
      this.emitEvent({type: "ACCEPTED", data: {type: this.room.settings.type}});
    })

    await this.joinHandshake(this.externalId, config.name, config.password, signal);
    response = await this.getEventResponse(["SIGNAL", "DENIED"]);
    if(response.type === "DENIED"){
      return response.data;
    }
    this.emitEvent({type: "ROOM_STATE", data: "ACTIVE"});
    return null;
  }

  async validateJoinRequest(id, name, password){
    let validations = [];
    if(name.length < 1 || name.length > 20){
      validations.push({field: "name", reason: "BAD_NAME"});
    }
    if(this.config.password && (password !== this.config.password)) {
      validations.push({field: "password", reason: "BAD_PASSWORD"});
    }
    let existingParticipant = this.participantMap.get(id);
    if(existingParticipant){
      validations.push({field: "id", reason: "ALREADY_JOINED"});
    }
    return validations;
  }

  async handleJoin({externalId, name, password, signal}) {
    try {
      name = await this.decryptValue(name, externalId);
      signal = await this.decryptValue(signal, externalId);
    } catch(error){
      console.error(error);
      this.denied(externalId, [{type: "externalId", reason: "CORRUPTED_VALUES"}]);
    }
    let problems = this.validateJoinRequest(externalId, name, password);
    if(problems.length > 0){
      return this.denied(problems)
    }
    this.setParticipant(externalId, name);
    this.handleSignal(externalId, signal);
    this.accepted(externalId);
  }

  async handleHost(room){
    this.publicKey = room.publicKey;
    this.room = room;
    if(room.settings.version != samspillVersion){
      await this.handleDenied({reason: "BAD_VERSION"});
      return false;
    }
    try {
      this.externalId = await wrapKeyIdForHost(this.keyId, this.publicKey);
    } catch(error){
      console.error(error);
      await this.handleDenied({reason: "BAD_KEY"});
    }
    this.emitEvent({type: "HANDSHAKE", data: room});
  }

  async handleDenied({reason}){
    this.emitEvent({type: "DENIED", data: {reason}});
  }

  handleSignal(source, signal){
    this.emitEvent({type: "SIGNAL", data: {source, signal}});
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

  async send(target, data){
    if(target != null && this.secure){
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
    this.appendLog.append(target, data);
  }
}





LocalStorageSignallingServer.ParticipantConnectionInput = WebSocketSignallingServer.ParticipantConnectionInput;
LocalStorageSignallingServer.HostConnectionDetails = WebSocketSignallingServer.HostConnectionDetails;

LocalStorageSignallingServer.HostConfigurationInput = function({validationNotes}) {
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
          {value: "SECURE", label: "Secure Room", description: "Encrypted metadata, not just encrypted payload. Requires link."},
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
LocalStorageSignallingServer.HostConfigurationInput.parseFormData = function(formData) {
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