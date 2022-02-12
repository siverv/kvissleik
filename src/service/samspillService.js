import { createSignal, createResource, observable, createRoot, onCleanup, createReaction } from 'solid-js';
import { addSignal } from '../utils/solidUtils';
import { generateKeyId, generateHostKeyPair } from '../utils/cryptoUtils';
import { TargetedJsonSerde } from '../utils/serdeUtils';
import { observeNext } from '../utils/solidUtils';
import { getSignallingServer } from './signalling'
import {PeerConnection} from './peerService';
import { Subject, filter, map, first } from 'rxjs';

class SamspillPeer {
  stateSignal = createSignal();
  get state() {
    return this.stateSignal[0]();
  }

  constructor(id){
    this.id = id;
    this.peer = new PeerConnection();
    this.stateSubscription = this.peer.state.subscribe(this.stateSignal[1]);
  }

  connect(...args){
    this.peer.connect(...args);
  }

  cleanup(){
    this.stateSubscription?.unsubscribe();
    this.dataSubscription?.unsubscribe();
    this.peer.cleanup();
  }

  signal(...args){
    this.peer.signal(...args);
  }

  send(type, payload){
    this.peer.send(type, payload);
  }

  subscribe(callback){
    this.dataSubscription = this.peer.data.subscribe(callback);
  }
}

class ParticipantPeer extends SamspillPeer {
  constructor(id, name){
    super(id);
    this.name = name;
  }

  connect(){
    this.peer.connect(false);
  }
}


class HostPeer extends SamspillPeer {
}


class SamspillClient {
  data = new Subject();
  connectionState = createSignal("NONE");
  initialize(config){
    this.config = config;
    let SignallingServer = getSignallingServer(config.signallingServer);
    console.log(SignallingServer)
    if(!SignallingServer){
      return false;
    }
    this.server = new SignallingServer(config);
    this.server.events.pipe(filter(event => event.type === "STATE"))
      .subscribe(this.connectionState[1]);
    this.server.events.pipe(filter(event => event.type === "MESSAGE"))
      .subscribe(event => this.handleMessage(event.source, event.data.type, event.data.payload));
    return true;
  }

  cleanup(){
    this.server?.cleanup();
  }

  sendServerMessage(target, type, payload) {
    this.server.send(target, {type, payload});
  }

  handleMessage(source, type, payload){
    // noop;
  }

  subscribe(fn){
    return this.data.subscribe(fn);
  }
}

export class SamspillHost extends SamspillClient {
  roomStateSignal = createSignal("NONE");
  subscriptions = [];


  participantMapSignal = createSignal(new Map());
  get participantMap(){
    return this.participantMapSignal[0]();
  }
  addParticipant(participant){
    this.participantMapSignal[1](
      new Map(this.participantMap).set(participant.id, participant)
    );
  }
  removeParticipant(participant){
    let map = new Map(this.participantMap);
    participant.close();
    map.delete(participant.id);
    this.participantMapSignal[1](map);
  }


  async initialize(config){
    let ok = super.initialize({role: "HOST", ...config});
    if(!ok){
      return false;
    }
    let roomEvents = this.server.events.pipe(filter(event => event.type.startsWith("ROOM")));
    roomEvents.pipe(map(event => {
      switch(event.type){
        case "ROOM_CREATE": return "CREATING";
        case "ROOM_CREATED": return "ACTIVE";
        case "ROOM_CREATION_DENIED": return "DENIED";
        case "ROOM_CLOSED": return "CLOSED";
      }
    })).subscribe(this.roomStateSignal[1]);
    roomEvents.pipe(first(event => event.type ))
    let {destroy, sleep, wake} = await this.server.createChannel({
      whoami: "host",
      ...config
    });
    this.destroyServer = destroy;
    this.sleepServer = sleep;
    this.wakeServer = wake;
    return true;
  }

  quit(){
    this.destroyServer();
    this.cleanup();
  }

  cleanup(){
    this.server.cleanup();
    for(let {unsubscribe} of this.subscriptions){
      unsubscribe();
    }
    for(let [_, participant] of this.participantMap){
      participant.cleanup();
    }
    super.destroy();
  }

  getParticipants(){
    return Array.from(this.participantMap.values())
  }

  handleMessage(source, type, payload) {
    switch(type){
      case "REQUEST_TO_JOIN_ROOM": {
        return this.handleRequestToJoin(source, payload.name, payload.password, payload.version);
      }
      case "SIGNAL": {
        let participant = this.participantMap.get(source);
        if(participant){
          participant.signal(payload, (counterSignal) => {
            this.subscriptions.push(
              participant.peer.data.subscribe(data => {
                this.data.next({participant, ...data});
              })
            );
            this.sendServerMessage(source, "SIGNAL", counterSignal);
          });
        }
        break;
      }
    }
  }


  broadcast(type, payload){
    console.log("broadcast", type, payload);
    for(let [id, participant] of this.participantMap){
      participant.send(type, payload);
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
}


export class SamspillParticipant extends SamspillClient {
  host = null;

  async initialize(config){
    super.initialize({role: "PARTICIPANT", ...config});
    let {close} = await this.server.openChannel({
      whoami: "participant",
      ...config
    });
    let response = new Promise((resolve, reject) => {
      this.server.events
        .pipe(first(event =>
          event.type === "MESSAGE"
          && ["ACCEPTED", "DENIED"].includes(event.data.type)))
        .subscribe(resolve);
    })
    this.sendServerMessage(null, "REQUEST_TO_JOIN_ROOM", {name: "jack"});
    this.closeServer = close;
    let event = await response;
    return event.type === "DENIED" ? event.type.denied : false;
  }

  quit(){
    this.cleanup();
  }

  cleanup(){
    this.closeServer();
    this.server.cleanup();
    this.host?.cleanup();
    super.destroy();
  }

  handleMessage(source, type, payload) {
    switch(type){
      case "ACCEPTED": {
        this.host = new HostPeer();
        this.host.connect(true, (signal) => {
          this.host.subscribe(data => {
            this.data.next(data)
          })
          this.sendServerMessage(source, "SIGNAL", signal);
        });
        break;
      }
      case "DENIED": {
        break;
      }
      case "SIGNAL": {
        this.host?.signal(payload);
        break;
      }
      case "KICKED": {
        break;
      }
    }
  }

  toHost(type, payload){
    this.host?.send(type, payload);
  }
}