import { createSignal, createResource, observable, createRoot, onCleanup, createReaction } from 'solid-js';
import { addSignal } from '../utils/solidUtils';
import { generateKeyId, generateHostKeyPair } from '../utils/cryptoUtils';
import { TargetedJsonSerde } from '../utils/serdeUtils';


async function observeNext(observer, predicate, timeout = 20 * 1000){
  return await new Promise((resolve, reject) => {
    createRoot((disposer) => {
      let timeoutId = setTimeout(() => {
        reject();
        disposer();
      }, 20 * 1000);
      let {unsubscribe} = observer.subscribe(data => {
        if(predice(data)){
          resolve(data);
          disposer();
        }
      });
      onCleanup(() => {
        clearTimeout(timeoutId);
        unsubscribe();
      });
      return new
    })
  });
}


class SignallingServerConnection {
  constructor(serde){
    this.serde = serde;
    const [get, set] = createSignal();
    this.receiveMessage = set;
    this.observer = observable(get);
  }
  subscribe(fn) {
    return this.observer.subscribe(fn);
  }
  async sendMessage(message) {
    this.sendData(await this.serde.encode(message));
  }
  async sendData(_data){
    // noop;
  }
  async receiveData(data) {
    this.receiveMessage(await this.serde.decode(data));
  }
  async connect(){
    // noop;
  }

  clear(){
    // noop;
  }

  destroy(){
    // noop;
  }
}

class WebSocketSignallingServer extends SignallingServerConnection {
  // TODO
}


class AppendOnlyLogSignallingServer extends SignallingServerConnection {
  offset = 0;
  pollingInterval = setInterval(this.poll.bind(this), 1000);

  constructor(serde, roomCode) {
    super(serde);
    this.roomCode = roomCode;
  }
  
  getLog(){
    return JSON.parse(localStorage.getItem(this.roomCode) || "[]");
  }
  append(item){
    localStorage.setItem(this.roomCode, JSON.stringify([
      ...this.getLog(),
      item
    ]));
  }

  
  sendData(data){
    this.append(data);
  }


  async poll(){
    let list = this.getLog().slice(this.offset);
    if(list.length){
      console.log("poll", list.length, list)
      this.offset += list.length;
      for(let i = 0; i < list.length; i++){
        await this.receiveData(list[i]);
      }
    }
  }
  async createRoom(){
    localStorage.setItem(this.roomCode, "[]");
    await this.connect();
  }
  async connect(){
    return true;
  }

  clear(){
    let log = this.getLog();
    localStorage.setItem(this.roomCode, JSON.stringify(log.map(() => null)));
  }
  destroy(){
    localStorage.removeItem(this.roomCode);
  }
}







class PeerConnection {
  constructor(){
    this.signal$ = createSignal(null);
    addSignal(this, "connected", false);
    addSignal(this, "data", {type: "NOOP"}, {equals: false});
    this.dataObservable = observable(this.data$);
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

  cleanup(){
    this.peer.close();
  }

  async isConnected(){
    return await new Promise((resolve) => {
      let track = createReaction(resolve);
      track(() => this.connected);
    })
  }

  _onError = this.onError.bind(this);
  onError(err){
    console.error("Peer:", err);
  }

  _onConnect = this.onConnect.bind(this);
  onConnect(){
    console.log("CONNECTED");
    this.connected = true;
  }

  _onClose = this.onClose.bind(this);
  onClose(){
    this.connected = false;
    this.peer = null;
    console.log("close");
  }

  _onSignal = this.onSignal.bind(this);
  onSignal(signal){
    console.log("signal", signal);
    this.signal$[1](signal);
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

  async awaitNextSignal(){
    return await new Promise((resolve, reject) => {
      createRoot((disposer) => {
        let {unsubscribe} = observable(this.signal$[0]).subscribe(signal => {
          if(signal){
            disposer();
            resolve(signal);
          }
        });
        onCleanup(unsubscribe);
      })
    })
  }


  send(type, payload) {
    this.peer?.send(JSON.stringify({
      type, 
      payload
    }));
  }

  subscribe(fn){
    return this.dataObservable.subscribe(fn);
  }
}





class SamspillClient {
  constructor(self, server) {
    this.self = self;
    this.server = server;
    createRoot(() => {
      this.unsubscribe = this.server.subscribe((message) => {
        if(message){
          this.handleMessage(message);
        }
      });
    })
  }

  cleanup(){
    this.unsubscribe?.();
  }

  async handleMessage(message) {
    console.log("HELLO", message);
  }
}

class SamspillHost extends SamspillClient {
  constructor(self, server, settings, addParticipant) {
    super(self, server);
    this.server = server;
    this.settings = settings;
    this.addParticipant = addParticipant;
  }

  async sendToTarget(target, type, payload) {
    await this.server.sendMessage({target, type, payload});
  }

  async initializeRoom(){
    await this.server.sendMessage({type: "HOST_INFO", payload: {
      source: this.self,
      info: {}
    }})
  }

  async closeRoom(){
    await this.server.sendMessage({type: "ROOM_CLOSED", payload: {}});
  }

  validateJoinRequest(name, password, version){
    let validations = [];
    if(version != this.settings.version){
      validations.push({field: "version", reason: "BAD_VERSION"});
    }
    if(name.length < 1 || name.length > 20){
      validations.push({field: "name", reason: "BAD_NAME"});
    }
    if(this.settings.password && (password != this.settings.password)) {
      validations.push({field: "password", reason: "BAD_PASSWORD"});
    }
    return validations;
  }

  async requestToJoin({source, signal, name, password, version}) {
    let reasonsNotToAccept = this.validateJoinRequest(name, password, version);
    if(reasonsNotToAccept.length > 0){
      await this.sendToTarget(source, "DENIED", {
        reasons: reasonsNotToAccept
      });
    } else {
      let participant = new PeerConnection();
      this.addParticipant(participant);
      await participant.connect(false);
      participant.signal(signal);
      let counterSignal = await participant.awaitNextSignal();
      await this.sendToTarget(source, "ACCEPTED", {
        counterSignal
      });
    }
  }

  async handleSignal({source, signal}){
    return {source, signal};
  }

  async handleMessage(message) {
    super.handleMessage(message);
    if(!message){
      return;
    }
    switch(message.type){
      case "REQUEST_TO_JOIN": {
        return await this.requestToJoin(message.payload);
      }
      case "SIGNAL": {
        return await this.handleSignal(message.payload);
      }
    }
  }
}



class SamspillParticipant extends SamspillClient{
  hostSignal = createSignal(null);
  hostObserver = observable(this.hostSignal[0]);

  connectionState = createSignal("DISCONNECTED");

  async awaitHost(){
    return await new Promise((resolve, reject) => {
      createRoot((disposer) => {
        let timeoutId = setTimeout(() => {
          reject();
          disposer();
        }, 20 * 1000);
        let {unsubscribe} = this.hostObserver.subscribe(host => {
          if(host){
            clearTimeout(timeoutId);
            resolve(host);
            disposer();
          }
        });
        onCleanup(unsubscribe);
      })
    })
  }


  joinResponseSignal = createSignal(null);
  joinResponseObserver = observable(this.joinResponseSignal[0]);
  async requestToJoinRoom(name, signal){
    return await new Promise((resolve, reject) => {
      this.sendToHost("REQUEST_TO_JOIN", {
        source: this.self, 
        signal,
        name
      })
      createRoot((disposer) => {
        let timeoutId = setTimeout(() => {
          reject();
          disposer();
        }, 20 * 1000);
        let {unsubscribe} = this.joinResponseObserver.subscribe(response => {
          if(response){
            clearTimeout(timeoutId);
            resolve(response);
            disposer();
          }
        });
        onCleanup(unsubscribe);
      })
    });
  }



  async sendToHost(type, payload) {
    await this.server.sendMessage({target: this.hostSignal[0](), type, payload});
  }

  async handleCounterSignal({signal}){
    return {signal};
  }

  async handleMessage(message) {
    super.handleMessage(message);
    if(!message){
      return;
    }
    switch(message.type){
      case "HOST_INFO": {
        let {source, info} = message.payload;
        this.hostSignal[1](source);
        break;
      }
      case "DENIED":
      case "ACCEPTED": {
        this.joinResponseSignal[1](message);
        return;
      }
      case "COUNTER_SIGNAL": {
        return await this.handleCounterSignal(message.payload);
      }
    }
  }
}



// Technically used mostly as an interface here.
class SignallingServer {
  eventSignal = createSignal();
  eventObservable = observable(this.eventSignal[0]);
  emitEvent = event => this.eventSignal[1](event);
  addEventListener(listener){
    return this.eventObservable.subscribe(listener);
  }

  async cleanup(){
    await this.closeChannel();
  }

  async createChannel(){
    return {
      destroy: () => {},
      sleep: () => {},
      wake: () => {},
    }
  }

  async openChannel(){
    return {
      close: () => {},
    }
  }


  async send(target, data){

  }
}

class LocalStorageAppendLog extends SignallingServer {
  offset = 0;
  pollingInterval = setInterval(this.poll.bind(this), 1000);
  sleeping = false;
  async poll(){
    let log = JSON.parse(localStorage.getItem(this.roomCode) || "[]");
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
          if(list[i].target === null || list[i].target === this.whoami){
            this.emitEvent({
              type: "MESSAGE",
              payload: list[i].data
            });
          }
        }
      }
    }
  }

  async cleanup(){
  }

  async createChannel(config){
    this.whoami = config.whoami;
    this.roomCode = (36n ** 4n).toString(36).padStart(4,"0").toUpperCase();
    localStorage.getItem(this.roomCode, "[]");
    this.emitEvent({type: "CONNECTING"});
    this.emitEvent({type: "CONNECTED"});
    return {
      destroy: () => {
        this.emitEvent({type: "DISCONNECTED"});
        localStorage.removeItem(this.roomCode);
        this.cleanup();
      },
      sleep: () => {
        await this.send(null, "SLEEP");
      },
      wake: () => {
        await this.send(null, "WAKE");
      }
    }
  }

  async openChannel(config){
    this.whoami = config.whoami;
    this.roomCode = config.roomCode;
    this.emitEvent({type: "CONNECTING"});
    this.emitEvent({type: "CONNECTED"});
    return {
      close: () => {
        this.emitEvent({type: "DISCONNECTED"});
        this.cleanup();
      };
    }
  }

  async send(target, data){
    localStorage.setItem(this.roomCode, JSON.stringify([
      ...this.getLog(),
      {target, data}
    ]));
  }
}

class WebSocketSignallingServer extends SignallingServer {
  async connect(config){
    const {protocol, host, query} = this.config;
    return await new Promise((resolve) => {
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
    this.emitEvent({type: "DISCONNECTED"});
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

  handleMessage(message){
    if(message.target === "SERVER") {
      this.emitEvent({type: "SERVER_MESSAGE", data: message.data});
    } else if(message.target == null || message.target == whoami) {
      this.emitEvent({type: "MESSAGE", data: message.data})
    }
  }

  async cleanup(){
    this.webSocket?.close();
  }


  async createChannel(config){
    this.whoami = config.whoami;
    this.emitEvent({type: "CONNECTING"});
    await this.connect({
      protocol: "ws:",
      host: "example.com:20899/socket",
      query: "?",
      type: "kvissleik",
      ...config
    });
    this.emitEvent({type: "CONNECTED"});
    let roomCode = await 
    return {
      destroy: () => {
        this.emitEvent({type: "DISCONNECTED"});
        localStorage.removeItem(this.roomCode);
        this.cleanup();
      },
      sleep: () => {
        await this.send(null, "SLEEP");
      },
      wake: () => {
        await this.send(null, "WAKE");
      }
    }
  }

  async openChannel(config){
    this.whoami = config.whoami;
    this.roomCode = config.roomCode;
    this.emitEvent({type: "CONNECTING"});
    this.emitEvent({type: "CONNECTED"});
    return {
      close: () => {
        this.emitEvent({type: "DISCONNECTED"});
        this.cleanup();
      };
    }
  }

  async request(data){
    return await new Promise((resolve, reject) => {
      let remove;
      remove = this.addEventListener({

      });
      this.send("SERVER", data);
    }
  }


  async send(target, data) {
    await this.webSocket.send(JSON.stringify({
      target,
      data
    }));
  }
}






class Participant {
  constructor(id, name){
    this.id = id;
    this.name = name;
    this.peer = new PeerConnection();
  }

  cleanup(){
    this.peer.cleanup();
  }

  getConnectionState(){
    return this.peer?.connected;
  }

  signal(signal){
    this.peer.signal(signal)
  }

  send(data){
    this.peer.send(data);
  }
}






class SamspillClient {
  async initialize(config){
    await this.cleanup();
    this.config = config;
    await this.connectToServer(config);
  }

  async connectToServer(config){
    this.server = new SignallingServer();
    this.unhandleServerEvents = this.server.addEventListener(this._handleServerEvents);
  }

  async cleanup(){
    this.unhandleServerEvents?.();
    await this.server?.cleanup();
  }

  async sendServerMessage(target, type, payload) {
    await this.server.send(target, type, payload);
  }

  _handleServerEvents = this.handleServerEvents.bind(this);
  handleServerEvents(type, payload){
    switch(type){
      case 'CLOSED': {
        return;
      }
      case 'NEW_PARTICIPANT': {
        return;
      }
      case 'MESSAGE': {
        return;
      }
    }
  }
}

class SamspillHost extends SamspillClient {
  async initialize(config){
    await super.initialize(config);
    await this.createRoom(config);
  }

  async createRoom(config){
    await this.server.createChannel(config);
    await this.sendServerMessage(null, "CREATE_ROOM", {
      enoughInformationToReliablyConnect: true
    });
  }

  async closeRoom(){
    await this.sendServerMessage(null, "ROOM_CLOSED", {
      thatsAllFolks: true
    });
    await this.server.destroyChannel();
  }

  async cleanup(){
    await this.closeRoom();
    await super.destroy();
  }


  handleServerEvents(type, payload){
    super.handleServerEvents(type, payload);
    switch(type){
      case 'REQUEST_TO_JOIN': {

      }
      case 'NEW_PARTICIPANT': {
        return;
      }
      case 'MESSAGE': {
        return;
      }
    }
  }


  broadcast(type, payload){
    for(let participant of this.participants){
      participant.send(message);
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
    if(!id.match(/^[a-z0-9]{50,}$/)){
      validations.push({field: "id", reason: "IS_A_BIT_WEIRD?"});
    }
    return validations;
  }

  async handleRequestToJoin(id, name, password, version) {
    let reasonsNotToAccept = this.validateJoinRequest(id, name, password, version);
    if(reasonsNotToAccept.length > 0){
      await this.sendToTarget(source, "DENIED", {
        reasons: reasonsNotToAccept
      });
    } else {
      let participant = new Participant(id, name);
      this.addParticipant(participant);
      await participant.signal(signal);
      let counterSignal = await participant.awaitNextSignal();
      await this.sendToTarget(source, "ACCEPTED", {
        counterSignal
      });
    }
  }

}











class SamspillHost extends SamspillClient {
  constructor(self, server, settings, addParticipant) {
    super(self, server);
    this.server = server;
    this.settings = settings;
    this.addParticipant = addParticipant;
  }

  async sendToTarget(target, type, payload) {
    await this.server.sendMessage({target, type, payload});
  }

  async initializeRoom(){
    await this.server.sendMessage({type: "HOST_INFO", payload: {
      source: this.self,
      info: {}
    }})
  }

  async closeRoom(){
    await this.server.sendMessage({type: "ROOM_CLOSED", payload: {}});
  }

  validateJoinRequest(name, password, version){
    let validations = [];
    if(version != this.settings.version){
      validations.push({field: "version", reason: "BAD_VERSION"});
    }
    if(name.length < 1 || name.length > 20){
      validations.push({field: "name", reason: "BAD_NAME"});
    }
    if(this.settings.password && (password != this.settings.password)) {
      validations.push({field: "password", reason: "BAD_PASSWORD"});
    }
    return validations;
  }

  async requestToJoin({source, signal, name, password, version}) {
    let reasonsNotToAccept = this.validateJoinRequest(name, password, version);
    if(reasonsNotToAccept.length > 0){
      await this.sendToTarget(source, "DENIED", {
        reasons: reasonsNotToAccept
      });
    } else {
      let participant = new PeerConnection();
      this.addParticipant(participant);
      await participant.connect(false);
      participant.signal(signal);
      let counterSignal = await participant.awaitNextSignal();
      await this.sendToTarget(source, "ACCEPTED", {
        counterSignal
      });
    }
  }

  async handleSignal({source, signal}){
    return {source, signal};
  }

  async handleMessage(message) {
    super.handleMessage(message);
    if(!message){
      return;
    }
    switch(message.type){
      case "REQUEST_TO_JOIN": {
        return await this.requestToJoin(message.payload);
      }
      case "SIGNAL": {
        return await this.handleSignal(message.payload);
      }
    }
  }
}



class SamspillParticipant extends SamspillClient{
  hostSignal = createSignal(null);
  hostObserver = observable(this.hostSignal[0]);

  connectionState = createSignal("DISCONNECTED");

  async awaitHost(){
    return await new Promise((resolve, reject) => {
      createRoot((disposer) => {
        let timeoutId = setTimeout(() => {
          reject();
          disposer();
        }, 20 * 1000);
        let {unsubscribe} = this.hostObserver.subscribe(host => {
          if(host){
            clearTimeout(timeoutId);
            resolve(host);
            disposer();
          }
        });
        onCleanup(unsubscribe);
      })
    })
  }


  joinResponseSignal = createSignal(null);
  joinResponseObserver = observable(this.joinResponseSignal[0]);
  async requestToJoinRoom(name, signal){
    return await new Promise((resolve, reject) => {
      this.sendToHost("REQUEST_TO_JOIN", {
        source: this.self, 
        signal,
        name
      })
      createRoot((disposer) => {
        let timeoutId = setTimeout(() => {
          reject();
          disposer();
        }, 20 * 1000);
        let {unsubscribe} = this.joinResponseObserver.subscribe(response => {
          if(response){
            clearTimeout(timeoutId);
            resolve(response);
            disposer();
          }
        });
        onCleanup(unsubscribe);
      })
    });
  }



  async sendToHost(type, payload) {
    await this.server.sendMessage({target: this.hostSignal[0](), type, payload});
  }

  async handleCounterSignal({signal}){
    return {signal};
  }

  async handleMessage(message) {
    super.handleMessage(message);
    if(!message){
      return;
    }
    switch(message.type){
      case "HOST_INFO": {
        let {source, info} = message.payload;
        this.hostSignal[1](source);
        break;
      }
      case "DENIED":
      case "ACCEPTED": {
        this.joinResponseSignal[1](message);
        return;
      }
      case "COUNTER_SIGNAL": {
        return await this.handleCounterSignal(message.payload);
      }
    }
  }
}
