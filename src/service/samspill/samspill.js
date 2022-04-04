import { createSignal } from 'solid-js';
import { getSignallingServer } from './signalling';
import { PeerConnection } from './peer';
import { EventStream } from './events';

class SamspillPeer {
  stateSignal = createSignal();
  get state() {
    return this.stateSignal[0]();
  }

  constructor(id){
    this.id = id;
    this.peer = new PeerConnection();
    this.removePeerStateSignal = this.peer.state.intoSignal(this.stateSignal);
  }

  connect(initiator, onSignal){
    this.onSignal = onSignal;
    this.initator = initiator;
    this.peer.connect(initiator, onSignal);
  }

  reconnect(){
    this.removeDataListener?.();
    this.removeStateListener?.();
    this.peer.cleanup();
    this.peer = new PeerConnection();
    this.peer.connect(this.initator, this.onSignal);
  }

  cleanup(){
    this.removeDataListener?.();
    this.removeStateListener?.();
    this.removePeerStateSignal?.();
    this.stateListener?.unsubscribe();
    this.peer.cleanup();
  }

  signal(...args){
    this.peer.signal(...args);
  }

  send(type, payload){
    this.peer.send(type, payload);
  }

  setDataListener(listener){
    this.removeDataListener = this.peer.data.addListener(listener);
  }

  setStateListener(listener){
    this.removeStateListener = this.peer.state.addListener(listener);
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
  data = new EventStream();
  connectionState = createSignal("DISCONNECTED");
  roomState = createSignal("NONE");
  initialize(config){
    this.config = config;
    let SignallingServer = getSignallingServer(config.signallingServer);
    if(!SignallingServer){
      return false;
    }
    this.server = new SignallingServer(config);
    this.removeEventListener = this.server.events.addListener(this.handleEvent.bind(this));
    return true;
  }

  handleEvent(event){
    switch(event.type){
      case "STATE": return this.connectionState[1](event.payload);
      case "ROOM_STATE": return this.roomState[1](event.payload);
    }
  }

  cleanup(){
    this.removeEventListener?.();
    this.server?.cleanup();
  }

  subscribe(fn){
    return {
      unsubscribe: this.data.addListener(fn)
    };
  }
}

export class SamspillHost extends SamspillClient {
  participantMapSignal = createSignal(new Map());

  get participantMap(){
    return this.participantMapSignal[0]();
  }
  
  addParticipant(participant){
    participant.connect(false);
    participant.setStateListener((state) => {
      this.handleParticipantStateChange(state, participant);
    });
    this.participantMapSignal[1](
      new Map(this.participantMap).set(participant.id, participant)
    );
  }
  
  removeParticipant(participant){
    let map = new Map(this.participantMap);
    participant.cleanup();
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
    for(let [_, participant] of this.participantMap){
      participant.cleanup();
    }
    super.destroy();
  }

  getParticipants(){
    return Array.from(this.participantMap.values());
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
        participant.setDataListener(data => {
          this.data.emit({participant, ...data});
        });
        this.server.signal(counterSignal, source);
      });
    }
  }

  handleParticipantsEvent(participants){
    let map = this.participantMap;
    for(let {id, name} of participants){
      let existing = map.get(id);
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
    let closed = this.getParticipants().filter(part => part.state === "CLOSED");
    if(closed.length > 0){
      this.server.wake();
    } else {
      // this.server.sleep();
    }
  }

  broadcast(type, payload){
    for(let [_id, participant] of this.participantMap){
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
      this.host.setDataListener(this.data.emit.bind(this.data));
      this.server.signal(signal);
    });
  }

  handleHostStateChange(state){
    if(state === "CLOSED"){
      this.host?.reconnect(true);
    } else if(state === "CONNECTED"){
      this.host?.send({type: "REQUEST_STATE"});
    }
  }

  toHost(type, payload){
    this.host?.send(type, payload);
  }
}