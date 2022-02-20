import { createSignal, observable } from 'solid-js';
import { getSignallingServer } from './signalling'
import {PeerConnection} from './peer';
import { Subject } from 'rxjs';

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

  connect(initiator, onSignal){
    this.onSignal = onSignal;
    this.initator = initiator;
    this.peer.connect(initiator, onSignal);
  }

  reconnect(){
    this.stateSubscription?.unsubscribe();
    this.dataSubscription?.unsubscribe();
    this.peer.cleanup();
    this.peer = new PeerConnection();
    this.peer.connect(this.initator, this.onSignal);
  }

  cleanup(){
    this.stateSubscription?.unsubscribe();
    this.dataSubscription?.unsubscribe();
    this.stateListener?.unsubscribe();
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

  setStateListener(callback){
    this.stateListener = observable(this.stateSignal[0]).subscribe((state) => {
      callback(state, this);
    })
  }
}

class ParticipantPeer extends SamspillPeer {
  constructor(id, name){
    super(id);
    this.name = name;
  }
}


class HostPeer extends SamspillPeer {
  
}


class SamspillClient {
  data = new Subject();
  connectionState = createSignal("DISCONNECTED");
  roomState = createSignal("NONE");
  initialize(config){
    this.config = config;
    let SignallingServer = getSignallingServer(config.signallingServer);
    if(!SignallingServer){
      return false;
    }
    this.server = new SignallingServer(config);
    this.server.events.subscribe(event => this.handleEvent(event));
    return true;
  }

  handleEvent(event){
    switch(event.type){
      case "STATE": return this.connectionState[1](event.payload);
      case "ROOM_STATE": return this.roomState[1](event.payload);
    }
  }

  cleanup(){
    this.server?.cleanup();
  }

  subscribe(fn){
    return this.data.subscribe(fn);
  }
}

export class SamspillHost extends SamspillClient {
  subscriptions = [];

  participantMapSignal = createSignal(new Map());
  
  get participantMap(){
    return this.participantMapSignal[0]();
  }
  
  addParticipant(participant){
    participant.connect(false);
    participant.setStateListener(this.handleParticipantStateChange.bind(this));
    this.participantMapSignal[1](
      new Map(this.participantMap).set(participant.id, participant)
    );
  }
  
  removeParticipant(participant){
    let map = new Map(this.participantMap);
    participant.close();
    map.delete(participant.id);
    this.participantMapSignal[1](map);
    this.server.kick(participant.id);
  }

  async initialize(config){
    let ok = super.initialize(config);
    if(!ok){
      return false;
    }
    return await this.server.createChannel(config);
  }

  quit(){
    this.server.quit();
    this.server.cleanup();
    this.cleanup();
  }

  gameStart(){
    this.server.sleep();
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

  handleEvent(event){
    super.handleEvent(event);
    switch(event.type){
      case "SIGNAL": return this.handleSignalEvent(event.data);
      case "PARTICIPANTS": return this.handleParticipantsEvent(event.data);
    }
  }

  handleSignalEvent({source, signal}){
    let participant = this.participantMap.get(source);
    if(participant){
      participant.signal(signal, (counterSignal) => {
        participant.subscribe(data => {
          this.data.next({participant, ...data});
        })
        this.server.signal(counterSignal, source);
      });
    }
  }

  handleParticipantsEvent(participants){
    let map = this.participantMap;
    for(let {id, name} of participants){
      let existing = this.participantMap.get(id);
      if(!existing){
        this.addParticipant(new ParticipantPeer(id, name));
      } else if(existing.name != name){
        // TODO: name change.
      }
    }
  }

  handleParticipantStateChange(state, participant){
    if(state === "CLOSED"){
      participant.reconnect(false);
    }
  }

  broadcast(type, payload){
    for(let [id, participant] of this.participantMap){
      participant.send(type, payload);
    }
  }
}


export class SamspillParticipant extends SamspillClient {
  host = null;

  async initialize(config){
    super.initialize(config);
    return await this.server.openChannel(config);
  }

  quit(){
    this.server.quit();
    this.cleanup();
  }

  cleanup(){
    this.closeServer();
    this.server.cleanup();
    this.host?.cleanup();
    super.destroy();
  }


  handleEvent(event){
    super.handleEvent(event);
    switch(event.type){
      case "SIGNAL": return this.host?.signal(event.data.signal);
      case "ACCEPTED": return this.handleAccepted(event.data);
      case "DENIED": return;
    }
  }

  handleAccepted({type}){
    this.type = type;
    this.host = new HostPeer();
    this.host.setStateListener(this.handleHostStateChange.bind(this));
    this.host.connect(true, (signal) => {
      this.host.subscribe(data => {
        this.data.next(data)
      });
      this.server.signal(signal);
    });
  }

  handleHostStateChange(state, participant){
    if(state === "CLOSED"){
      participant.reconnect(true);
    }
  }

  toHost(type, payload){
    this.host?.send(type, payload);
  }
}