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
    this.peer.state.subscribe((state) => console.log(state))
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
    console.log("part: ", !!participant)
    if(participant){
      participant.signal(signal, (counterSignal) => {
        console.log("COUNTER SIGNAL", source)
        this.subscriptions.push(
          participant.peer.data.subscribe(data => {
            this.data.next({participant, ...data});
          })
        );
        this.server.signal(counterSignal, source);
      });
    }
  }

  handleParticipantsEvent(participants){
    let map = this.participantMap;
    console.log(participants)
    for(let {id, name} of participants){
      let existing = this.participantMap.get(id);
      if(!existing){
        let participant = new ParticipantPeer(id, name);
        participant.connect(false);
        this.addParticipant(participant);
      } else if(existing.name != name){
        // TODO: name change.
      }
    }
  }

  broadcast(type, payload){
    console.log("broadcast", type, payload);
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
    this.host.connect(true, (signal) => {
      this.host.subscribe(data => {
        this.data.next(data)
      });
      this.server.signal(signal);
    });
  }

  toHost(type, payload){
    this.host?.send(type, payload);
  }
}