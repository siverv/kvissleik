import {createSignal, observable, onCleanup} from 'solid-js';
import { CopyToClipboardButton } from '../../components/ui/CopyToClipboardButton';
import { RoomCodeEntry } from '../../components/ui/RoomCodeEntry';
import { RadioGroup } from '../../components/ui/RadioGroup';
import {SignallingServer, applyDefaultRoomCodeConfig} from './signallingPluginTemplate';
import {useSearchParams} from 'solid-app-router';
import {generateAlphabeticalId} from '../../utils/cryptoUtils';


// Useful for testing purposes locally without a websocket-server.
// Can also be a standin for "public append logs" wrt. needs.
export class LocalStorageAppendLog extends SignallingServer {
  static SIGNALLING_SERVER_ID = "TEST";
  static details = {
    name: "Local Test",
    description: "LocalStorage-based signalling server for testing purposes. Acts like polling a public append log.",
  };

  offset = 0;
  pollingInterval = setInterval(this.poll.bind(this), 1000);
  sleeping = false;
  getLog(){
    return JSON.parse(localStorage.getItem(this.roomCode) || "[]");
  }
  poll(){
    let log = this.getLog();
    let list = log.slice(this.offset);
    if(list.length){
      this.offset += list.length;
      for(let i = 0; i < list.length; i++){
        if(list[i].data === "SLEEP"){
          this.sleeping = true;
          continue;
        } else if(list[i].data === "WAKE"){
          this.sleeping = false;
          continue;
        }
        if(!this.sleeping){
          if(list[i].target == null || list[i].target === this.whoami){
            this.emitEvent({
              type: "MESSAGE",
              source: list[i].source,
              data: list[i].data
            });
          }
        }
      }
    }
  }

  async handleMessage(source, data){
    if(this.host){

    } else {
      if(data.type === "ACCEPTED"){

      }
    }
  }

  cleanup(){
  }

  createChannel(config){
    this.host = true;
    this.whoami = config.whoami;
    this.emitEvent({type: "STATE", data: "CONNECTING"});
    this.createChannelConfig(config);
    localStorage.setItem(this.roomCode, "[]");
    this.send(null, {type: "HOSTING"})
    this.emitEvent({type: "STATE", data: "CONNECTED"});
    return {
      destroy: () => {
        this.emitEvent({type: "STATE", data: "DISCONNECTED"});
        localStorage.removeItem(this.roomCode);
        this.cleanup();
      },
      sleep: () => {
        this.send(null, {type: "SLEEP"});
      },
      wake: () => {
        this.send(null, {type: "WAKE"});
      }
    }
  }


  handleMessage(source, type, payload) {
    switch(type){
      case "REQUEST_TO_JOIN_ROOM": {
        return this.handleRequestToJoin(source, payload.name, payload.password, payload.version);
      }
    }
  }

  validateJoinRequest(id, name, password, version){
    let validations = [];
    if(version != this.config.version){
      validations.push({field: "version", reason: "BAD_VERSION"});
    }
    if(name.length < 1 || name.length > 20){
      validations.push({field: "name", reason: "BAD_NAME"});
    }
    if(this.config.password && (password != this.config.password)) {
      validations.push({field: "password", reason: "BAD_PASSWORD"});
    }
    // if(!id.match(/^[a-z0-9]{50,}$/)){
    //   validations.push({field: "id", reason: "IS_A_BIT_WEIRD?"});
    // }
    let existingParticipant = this.participantMap.get(id);
    if(existingParticipant){
      // Consider allowing take-overs...
      // id should be unique enough that this would be without problem in most cases, no? 
      validations.push({field: "id", reason: "ALREADY_JOINED?"});

    }
    return validations;
  }

  handleRequestToJoin(id, name, password, version) {
    let problems = this.validateJoinRequest(id, name, password, version);
    if(problems.length > 0){
      return this.sendServerMessage(id, "DENIED", {reasons: problems});
    }
    let participant = new ParticipantPeer(id, name);
    this.addParticipant(participant);
    participant.connect();
    this.sendServerMessage(id, "ACCEPTED", {});
  }


  openChannel(config){
    this.host = false;
    this.whoami = config.whoami;
    this.openChannelConfig(config);
    this.emitEvent({type: "STATE", data: "CONNECTING"});
    this.emitEvent({type: "STATE", data: "CONNECTED"});
    return {
      close: () => {
        this.emitEvent({type: "STATE", data: "DISCONNECTED"});
        this.cleanup();
      }
    }
  }

  send(target, data){
    localStorage.setItem(this.roomCode, JSON.stringify([
      ...this.getLog(),
      {target, source: this.whoami, data}
    ]));
  }
}


applyDefaultRoomCodeConfig(LocalStorageAppendLog);