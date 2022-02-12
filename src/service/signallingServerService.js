import {observeNext} from '../utils/solidUtils';
import {createSignal, observable, onCleanup} from 'solid-js';
import { Subject, first } from 'rxjs';
import * as xyz from 'rxjs';

// Technically used mostly as an interface here.
class SignallingServer {
  events = new Subject();
  emitEvent(data){
    this.events.next(data);
  }
  addEventListener(listener){
    return this.events.subscribe(listener);
  }
  /*
  async cleanup(){
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
  */
}


// This one has a great need for direct access to UI, while others can survive on config.
// I'm considering "packaging" these modules with ui, but would probably need to reduce async or improve root-chaining
class CopyPasteSignalling extends SignallingServer {
  cleanup(){}
  createChannel(){
    // Display link for copying.
    // Display textarea for pasting.
    return {
      destroy: () => {}, // remove textarea.
      sleep: () => {}, // hide textarea
      wake: () => {}, // show textarea
    }
  }
  openChannel(){
    // Display textarea for pasting.
    return {
      close: () => {} // remove textarea
    }
  }
  send(target, data){
    // Display HTML about what to copy and who to paste it to.
  }
}


// Useful for testing purposes locally without a websocket-server.
// Can also be a standin for "public append logs" wrt. needs.
class LocalStorageAppendLog extends SignallingServer {
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

  cleanup(){
  }

  createChannel(config){
    this.whoami = config.whoami;
    this.roomCode = Math.floor(Math.random() * (36 ** 4)).toString(36).padStart(4,"0").toUpperCase();
    localStorage.setItem(this.roomCode, "[]");
    this.emitEvent({type: "STATE", data: "CONNECTING"});
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

  openChannel(config){
    this.whoami = config.whoami;
    this.roomCode = config.code;
    console.log(this.code);
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

class WebSocketSignallingServer extends SignallingServer {
  async connect(config){
    const {protocol, host, query} = this.config;
    return await new Promise((resolve) => {
      this.emitEvent({type: "STATE", data: "CONNECTING"});
      if(this.webSocket){
        this.cleanup();
      }
      this.webSocket = new WebSocket(`${protocol}//${host}${query}`);
      this.webSocket.addEventListener("open", this._onOpen);
      this.webSocket.addEventListener("close", this._onClose);
      this.webSocket.addEventListener("message", this._onMessage);
      this.resolveConnecting = resolve;
    });
  }

  _onOpen = this.onOpen.bind(this);
  onOpen(){
    this.emitEvent({type: "CONNECTED"});
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
    if(message.source === "SERVER") {
      this.emitEvent({type: "SERVER_MESSAGE", data: message.data});
    } else if(message.target == null || message.target == whoami) {
      this.emitEvent({type: "MESSAGE", source: message.source, data: message.data})
    }
  }

  cleanup(){
    this.webSocket.removeEventListener("open", this._onOpen);
    this.webSocket.removeEventListener("close", this._onClose);
    this.webSocket.removeEventListener("message", this._onMessage);
    this.webSocket?.close();
  }


  async createChannel(config){
    this.whoami = config.whoami;
    await this.connect({
      protocol: "ws:",
      host: "example.com:20899/socket",
      query: "?host",
      type: "kvissleik",
      ...config
    });
    this.request({type: "ROOM_CREATE"}, (response) => {
      if(response.data.roomCode){
        this.emitEvent({
          type: "ROOM_CREATED",
          data: {roomCode: response.data.roomCode}
        });
      } else {
        this.emitEvent({
          type: "ROOM_CREATION_DENIED"
        });
      }
    });
    return {
      destroy: () => {
        localStorage.removeItem(this.roomCode);
        this.cleanup();
      },
      sleep: () => {
        this.send("SERVER", {type: "SLEEP"});
      },
      wake: () => {
        this.send("SERVER", {type: "WAKE"});
      }
    }
  }

  async openChannel(config){
    this.whoami = config.whoami;
    this.roomCode = config.roomCode;
    await this.connect({
      protocol: "ws:",
      host: "example.com:20899/socket",
      query: "?join",
      type: "kvissleik",
      ...config
    });
    this.request({type: "REQUEST_TO_JOIN_ROOM", payload: {
      name: config.name,
      roomCode: this.roomCode
    }}, (response) => {
      if(response.data.accepted){
        this.emitEvent({
          type: "ACCEPTED",
          data: {roomCode: response.data.roomCode}
        });
      } else {
        this.emitEvent({
          type: "DENIED"
        });
      }
    });
    return {
      close: () => {
        this.cleanup();
      }
    }
  }

  request(data, onResponse){
    this.events.pipe(first(({type}) => type === "SERVER_MESSAGE")).subscribe(onResponse);
    this.send("SERVER", data);
  }


  send(target, data) {
    this.webSocket.send(JSON.stringify({
      target,
      source: this.whoami,
      data
    }));
  }
}



export function createSignallingServer(config){
  if(config.signallingServer === "TEST"){
    return new LocalStorageAppendLog();
  } else if(config.signallingServer === "ROOM_CODE"){
    return new WebSocketSignallingServer();
  } else if(config.signallingServer === "COPYPASTE"){
    return new CopyPasteSignalling();
  } else return null;
}