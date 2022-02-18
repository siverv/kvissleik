import {createSignal, observable, onCleanup} from 'solid-js';
import { CopyToClipboardButton } from '../../components/ui/CopyToClipboardButton';
import { RoomCodeEntry } from '../../components/ui/RoomCodeEntry';
import { RadioGroup } from '../../components/ui/RadioGroup';
import {SignallingServer, applyDefaultRoomCodeConfig} from './signallingPluginTemplate';
import {useSearchParams} from 'solid-app-router';
import {generateAlphabeticalId} from '../../utils/cryptoUtils';

const samspillVersion = import.meta.env.VITE_SAMSPILL_VERSION;

class LocalStorageAppendLog {
  constructor(identity, logId, interval = 1000, secure=false){
    this.identity = identity;
    this.logId = logId;
    this.interval = interval;
    this.offset = 0;
    this.listeners = [];
    this.pollingInterval = setInterval(this.poll.bind(this), this.interval);
    this.sleeping = false;
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
        let {target, entry} = list[i];
        if(entry.type === "SLEEP"){
          this.sleeping = true;
          continue;
        } else if(data.type === "WAKE"){
          this.sleeping = false;
          continue;
        }
        if(!this.sleeping){
          if(target == null || target === this.identity){
            this.emit(entry);
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
  append(target, {type, data}){
    localStorage.setItem(this.logId, JSON.stringify([
      ...this.getLog(),
      {target, entry: {type, data}}
    ]));
  }
}


// Useful for testing purposes locally without a websocket-server.
// Can also be a standin for "public append logs" wrt. needs.
export class LocalStorageSignallingServer extends SignallingServer {
  static SIGNALLING_SERVER_ID = "TEST";
  static details = {
    name: "Local Test",
    description: "LocalStorage-based signalling server for testing purposes. Acts like polling a public append log.",
  };

  connect(){

  }

  cleanup(){
    this.appendLog.cleanup()
  }


  async hostHandshake(publicKey, settings){
    this.appendLog.create();
    await this.send(null, {type: "HOST", data: {
      publicKey,
      settings: {
        version: samspillVersion,
        type: settings.type,
        hasPassword: Boolean(settings.password)
      }
    }});
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
    this.send(target, {type: "ACCEPTED"});
  }

  async denied(target, reasons){
    this.send(target, {type: "DENIED", data: reasons});
  }

  async kick(externalId){
    // TODO
  }

  async joinHandshake(externalId, name, password){
    name = await this.wrapValue(name);
    password = password && await this.wrapValue(password);
    signal = this.wrapValue(JSON.stringify(signal));
    await this.send(null, {type: "JOIN", data: {
      externalId,
      name,
      password
    }});
  }

  async signal(signal, target = "host"){
    await this.send(target, {type: "SIGNAL", data: signal});
  }

  async handleMessage(source, data){
    if(this.host){
      switch(data.type){
        case 'JOIN': return await this.handleJoin(data.payload);
      }
    } else {
      switch(data.type){
        case 'HOST': return await this.handleHost(data.payload);
        case 'SIGNAL': return await this.handleHostSignal(data.payload)
        case 'DENIED': return await this.handleDenied(data.payload);
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

  createChannel(config){
    this.host = true;
    this.whoami = "host";
    this.secure = connectionConfig.roomCodeType === "SECURE";
    this.hidden = connectionConfig.roomCodeType === "HIDDEN";
    this.roomCode = this.createRoomCode();
    this.config = config;

    this.emitEvent({type: "STATE", data: "CONNECTING"});
    this.appendLog = new LocalStorageAppendLog(this.whoami, this.roomCode);
    this.appendLog.addListener(entry => this.handleMessage(entry));
    this.emitEvent({type: "STATE", data: "CONNECTED"});

    const keys = await generateHostKeyPair(this.roomKey);
    this.privateKey = keys.privateKey;
    this.publicKey = keys.publicKey;

    this.hostHandshake(this.publicKey, {
      type: config.type,
      password: config.password
    });
  }

  async firstEntry(types){
    return await new Promise((resolve) => {
      let remove;
      remove = this.appendLog.addListener(entry => {
        if(types.includes(entry.type)){
          remove();
          resolve(entry) 
        }
      })
    })
  }

  async openChannel(config){
    this.host = false;
    this.whoami = config.whoami;
    this.roomCode = this.createRoomCode();

    this.emitEvent({type: "STATE", data: "CONNECTING"});
    this.appendLog = new LocalStorageAppendLog(this.whoami, this.roomCode);
    this.appendLog.addListener(entry => this.handleMessage(entry));
    let room = await firstEntry(["HOST"]);
    if(room.settings.version != samspillVersion){
      this.emitEvent({type: "DENIED", reason: "BAD_VERSION"});
      return false;
    }

    this.join(this.externalId, name, password);
    let response = await firstEntry(["ACCEPTED", "DENIED"]);
    if(response.type === "DENIED"){
      this.emitEvent({type: "DENIED", reason: response.data});
      return false;
    }

    this.emitEvent({type: "STATE", data: "CONNECTED"});
    return true;
  }

  validateJoinRequest(id, name, password, version){
    let validations = [];
    if(name.length < 1 || name.length > 20){
      validations.push({field: "name", reason: "BAD_NAME"});
    }
    if(this.config.password && (password != this.config.password)) {
      validations.push({field: "password", reason: "BAD_PASSWORD"});
    }
    let existingParticipant = this.participantMap.get(id);
    if(existingParticipant){
      // Consider allowing take-overs...
      // id should be unique enough that this would be without problem in most cases, no? 
      validations.push({field: "id", reason: "ALREADY_JOINED?"});

    }
    return validations;
  }

  handleJoin({externalId, name, password}) {
    let problems = this.validateJoinRequest(id, name, password, version);
    if(problems.length > 0){
      return this.denied(problems)
    }

    let participant = new ParticipantPeer(id, name);
    this.addParticipant(participant);
    participant.connect();
    this.accepted(externalId);
  }

  send(target, data){
    this.appendLog.append(target, data);
  }
}


applyDefaultRoomCodeConfig(LocalStorageAppendLog);