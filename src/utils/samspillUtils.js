import { observable } from "solid-js";
import { addSignal } from "./solidUtils";

class ClientPeer {
  constructor(room){
    this.room = room;
    addSignal(this, "connected", false);
    addSignal(this, "data", {type: "NOOP"}, {equals: false});
  }

  connect(initiator){
    if(this.connected) {
      return;
    }
    // eslint-disable-next-line no-undef
    this.peer = new SimplePeer({
      initiator,
      trickle: false
    });
    this.peer.on('error', this._onError);
    this.peer.on('signal', this._onSignal);
    this.peer.on('connect', this._onConnect);
    this.peer.on('data', this._onData);
  }

  _onError = this.onError.bind(this);
  onError(err){
    console.error("Peer:", err);
  }

  _onConnect = this.onConnect.bind(this);
  onConnect(){
    this.connected = true;
  }

  _onClose = this.onClose.bind(this);
  onClose(){
    this.connected = false;
    this.peer = null;
  }

  _onSignal = this.onSignal.bind(this);
  onSignal(_signal){
    // noop;
  }

  _onData = this.onData.bind(this);
  onData(data){
    try {
      const {type, payload} = JSON.parse(data.toString());
      this.data = {type, payload};
    } catch(err) {
      console.error(err, data);
    }
  }

  signal(signal){
    this.peer?.signal(signal);
  }

  send(type, payload) {
    this.peer?.send(JSON.stringify({
      type, 
      payload
    }));
  }
}

class Participant extends ClientPeer {
  constructor(room, id, name){
    super(room);
    this.id = id;
    this.name = name;
  }

  connect(){
    super.connect(false);
  }

  onSignal(signal){
    super.onSignal.apply(this, arguments);
    this.room.send("SIGNAL", {id: this.id, signal});
  }
}

class Host extends ClientPeer {
  connect(){
    super.connect(true);
  }

  onSignal(signal){
    super.onSignal.apply(this, arguments);
    this.room.send("SIGNAL", {signal});
  }

  send(type, payload) {
    super.send(type, {
      id: this.room.participantId,
      ...payload
    });
  }
}

class ClientRoom {
  constructor(config){
    this.config = {
      protocol: "ws:",
      host: "example.com:20899/socket",
      query: "?",
      type: "kvissleik",
      ...config
    };
    addSignal(this, "connected", false);
  }

  connectToLobby(){
    const {protocol, host, query} = this.config;
    this.connecting = new Promise((resolve) => {
      this.webSocket = new WebSocket(`${protocol}//${host}${query}`);
      this.webSocket.addEventListener("open", this._onOpen);
      this.webSocket.addEventListener("close", this._onClose);
      this.webSocket.addEventListener("message", this._onMessage);
      this.resolveConnecting = resolve;
    });
  }

  _onOpen = this.onOpen.bind(this);
  onOpen(){
    this.connected = true;
    this.resolveConnecting(true);
  }

  _onClose = this.onClose.bind(this);
  onClose(){
    this.webSocket = null;
    this.connected = false;
  }

  _onMessage = this.onMessage.bind(this);
  onMessage(message){
    try {
      let {type, payload} = JSON.parse(message.data);
      this.handleMessage(type, payload);
    } catch(e) {
      console.error(e);
    }
  }

  handleMessage(_message){
    // noop
  }

  send(type, payload) {
    this.webSocket.send(JSON.stringify({
      type,
      payload
    }));
  }
}



export class HostedRoom extends ClientRoom {

  constructor(config){
    super({
      query: "?host",
      ...config,
    });
    addSignal(this, "roomCode", null);
    addSignal(this, "participants", []);
    addSignal(this, "data", {id: null, type: "NOOP"}, {equals: false});
  }

  addParticipant(id, name){
    let participant = new Participant(this, id, name);
    observable(participant.data$).subscribe(({type, payload}) => {
      this.data = {id: participant.id, type, payload};
    });
    this.participants = this.participants.concat(participant);
  }

  onOpen(){
    super.onOpen.apply(this, arguments);
    const {type, settings} = this.config;
    this.send("CREATE_ROOM", {type, settings});
  }

  handleMessage(type, payload){
    switch(type) {
    case "ROOM": {
      let {code, participants} = payload;
      this.roomCode = code;
      let oldParticipants = this.participants;
      this.participants = participants.map((id, name) => {
        let old = oldParticipants.find(part => part.id === id);
        return old ?? new Participant(this, id, name);
      });
      break;
    }
    case "PARTICIPANT_ADDED": {
      let {id, name} = payload;
      this.addParticipant(id, name);
      break;
    }
    case "SIGNAL": {
      let {id, signal} = payload;
      let participant = this.participants.find(part => part.id === id);
      if(participant){
        if(!participant.peer) {
          participant.connect();
        }
        participant.signal(signal);
      }
      break;
    }
    }
  }

  broadcast(type, payload) {
    for(let participant of this.participants) {
      participant.send(type, payload);
    }
  }
}


export class JoinedRoom extends ClientRoom {
  static RoomStates = {
    IDLE: "IDLE",
    JOINING: "JOINING",
    DENIED: "DENIED",
    JOINED: "JOINED"
  };

  constructor(config){
    super({
      query: "?join",
      ...config,
    });
    addSignal(this, "participantId", false);
    addSignal(this, "roomState", JoinedRoom.RoomStates.IDLE);
    addSignal(this, "deniedForReason", null);
    this.host = new Host(this);
  }

  canJoinRoom(){
    switch(this.roomState){
    case JoinedRoom.RoomStates.IDLE:
    case JoinedRoom.RoomStates.DENIED:
      return true;
    }
    return false;
  }

  isJoiningRoom(){
    return this.roomState === JoinedRoom.RoomStates.JOINING;
  }

  inRoom(){
    return this.roomState === JoinedRoom.RoomStates.JOINED;
  }

  joinRoom(roomCode, name) {
    if(!this.canJoinRoom()){
      return false;
    }
    this.deniedForReason = null;
    this.roomCode = roomCode;
    this.name = name;
    this.send("JOIN_ROOM", {name, code: roomCode});
  }

  toHost(type, payload) {
    this.host.send(type, {
      id: this.participantId,
      ...payload,
    });
  }

  handleMessage(type, payload){
    switch(type) {
    case "SIGNAL": {
      let {signal} = payload;
      this.host.signal(signal);
      break;
    }
    case "REQUEST_DENIED": {
      const {reason} = payload;
      this.roomState = JoinedRoom.RoomStates.DENIED;
      this.deniedForReason = reason;
      break;
    }
    case "ROOM_JOINED": {
      let {type, id} = payload;
      this.participantId = id;
      this.roomState = JoinedRoom.RoomStates.JOINED;
      this.roomType = type;
      this.host.connect();
      break;
    }
    }
  }
}