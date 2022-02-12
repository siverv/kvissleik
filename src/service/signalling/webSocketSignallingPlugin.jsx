import {createSignal, observable, onCleanup} from 'solid-js';
import { CopyToClipboardButton } from '../../components/ui/CopyToClipboardButton';
import { RoomCodeEntry } from '../../components/ui/RoomCodeEntry';
import {SignallingServer as _SignallingServer} from './signallingPluginTemplate';
import {useSearchParams} from 'solid-app-router';

export class WebSocketSignallingServer extends _SignallingServer {
  static SIGNALLING_SERVER_ID = "WS";
  static details = {
    name: "Samspill",
    description: "WebSocket-based",
  }
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


WebSocketSignallingServer.ParticipantConnectionInput = function({setConnectionDetails}) {
  let [searchParams] = useSearchParams()
  return <RoomCodeEntry notes={note.code} initialValue={searchParams.code}/>;
}
WebSocketSignallingServer.ParticipantConnectionInput.parseFormData = function(formData) {
  const validationMap = new Map();
  const connectionDetails = {};
  connectionDetails.code = RoomCodeEntry.parseFormData(formData);
  if(connectionDetails.code.length < 4){
    validationMap.set("code", "Code is too short: needs to be at least 4 characters");
  } else if(connectionDetails.code.match(/^[A-Z0-9]$/)){
    validationMap.set("code", "Code contains invalid characters");
  }
  return [
    connectionDetails,
    validationMap
  ]
}

WebSocketSignallingServer.HostConnectionDetails = function({server}) {
  return <>
    <Show when={server.getRoomCode()}>
      {code => <h3>
          Room code is {code}
        <CopyToClipboardButton getValue={() => code}>
          copy
        </CopyToClipboardButton>
      </h3>
      }
    </Show>
    <Show when={server.getRoomLink()}>
      {link => <div>
        <b>Invite players by link: </b>
        <a href={link}>
          {link}
        </a>
        <CopyToClipboardButton getValue={() => link}>
          copy
        </CopyToClipboardButton>
      </div>}
    </Show>
  </>
}