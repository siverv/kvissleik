
import {EventStream} from './events';

export class PeerConnection {
  signals = new EventStream();
  data = new EventStream();
  state = new EventStream();
  currentState = null;

  constructor(){
    this.state.addListener(state => this.currentState = state);
  }

  get connected() {
    return this.currentState === "CONNECTED";
  }

  connect(initiator, onSignal){
    this.state.emit("CONNECTING");
    // eslint-disable-next-line no-undef
    this.peer = new SimplePeer({
      initiator,
      trickle: false
    });
    this.peer.on('error', this.onError.bind(this));
    this.peer.on('close', this.onClose.bind(this));
    this.peer.on('signal', this.onSignal.bind(this));
    this.peer.on('connect', this.onConnect.bind(this));
    this.peer.on('data', this.onData.bind(this));
    if(onSignal){
      this.signals.next().then(onSignal);
    }
  }

  cleanup(){
    this.peer?.destroy();
  }

  onError(error){
    console.error(error);
    this.state.emit({error});
  }

  onConnect(){
    console.log("Connected");
    this.state.emit("CONNECTED");
  }

  onClose(){
    this.peer = null;
    console.log("Closed");
    this.state.emit("CLOSED");
  }

  onSignal(signal){
    this.signals.emit(signal);
  }

  onData(data){
    try {
      const {type, payload} = JSON.parse(data.toString());
      this.data.emit({type, payload});
    } catch(err) {
      console.error(err, data);
    }
  }

  signal(signal, onCounterSignal){
    this.signals.next().then(onCounterSignal);
    this.peer?.signal(signal);
  }

  send(type, payload) {
    if(this.connected){
      this.peer?.send(JSON.stringify({
        type, 
        payload
      }));
    }
  }
}