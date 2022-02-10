import {createSignal, observable} from 'solid-js';

class Room {
  dataSignal = createSignal();
  dataObservable = observable(dataSignal[0]);
  
  async initialize(config){
    // noop;
  }

  cleanup(){
    // noop;
  }

  subscribe(fn){
    return this.dataObservable.subscribe(fn);
  }
}

export class HostedRoom extends Room {
  participants = [];
  participantDataSignal = createSignal();
  participantDataObservable = observable(this.participantDataSignal[0]);

  cleanupList = [];

  async initialize(config) {
    this.config = config;
    this.quiz = config.quiz;
    this.roomCode = "ABCD";
    this.roomKey = await generateKeyId();
    const {privateKey, publicKey} = await generateHostKeyPair(this.roomKey);
    this.privateKey = privateKey;
    this.id = this.publicKey = publicKey;
    console.log(this.id);
    // this.keys = await createKeys();
    this.participants = [];
    this.serde = new TargetedJsonSerde(this.id);
    this.server = new AppendOnlyLogSignallingServer(this.serde, this.roomCode);
    this.client = new SamspillHost(this.id, this.server, config, participant => this.addParticipant(participant));

    await this.server.createRoom();
    await this.client.initializeRoom();

    return true;
  }

  cleanup(){
    super.cleanup();
    this.cleanupList.forEach(fn => fn());
  }

  addParticipant(participant){
    this.participants.push(participant);
    this.cleanupList.push(
      participant.subscibe(data => {
        this.participantDataSignal[1]({
          participant,
          data
        })
      })
    );
  }

  getParticipants(){
    return this.participants;
  }

  broadcast(type, payload) {
    for(let participant of this.participants) {
      participant.send(type, payload);
    }
  }
}

export class JoinedRoom extends Room{
  async initialize(config){
    this.id = await generateKeyId();
    this.roomCode = "ABCD";
    this.serde = new TargetedJsonSerde(this.id);
    this.server = new AppendOnlyLogSignallingServer(this.serde, this.roomCode);
    this.client = new SamspillParticipant(this.id, this.server);
    this.peerConnection = new PeerConnection(this.id, true);
    await this.server.connect();
    this.peerConnection.connect(true)
    let [signal, host] = await Promise.all([
      this.peerConnection.awaitNextSignal(),
      this.client.awaitHost()
    ]);
    let response = await this.client.requestToJoinRoom(config.name, signal);
    if(response.type === "ACCEPTED") {
      this.peerConnection.signal(response.payload.counterSignal);
      await this.peerConnection.isConnected();
    } else {
      return response.payload;
    }
  }

  cleanup(){
    super.cleanup();
    this.cleanupList.forEach(fn => fn());
  }

  isCompatibleWithConfig(config){
    if(!this.config){
      return false;
    } else {
      return true;
    }
  }

  toHost(type, payload) {
    this.host.send(type, {
      id: this.participantId,
      ...payload,
    });
  }
}




class HostedRoom {
  initialize(config){
    if(this.server){
      this.server.destroy();
    }
    this.server = await createSignallingServer(config);
    this.unhandleServerEvent = this.server.subscribe(this._handleServerEvent);
  }

  destroy(){
    this.unhandleServerEvent?.();
    this.server.destroy();
  }


  _handleServerEvent = this.handleServerEvent.bind(this);
  handleServerEvent(type, payload){

  }


  broadcast(type, payload){
    for(let participant of this.participants){
      participant.send(message);
    }
  }
}









class SamspillHost {

}


function createSamspillHost(){
  
}