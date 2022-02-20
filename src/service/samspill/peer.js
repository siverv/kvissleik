
import {Subject, first} from 'rxjs';

export class PeerConnection {
  signals = new Subject();
  data = new Subject();
  state = new Subject();
  currentState = null;

  constructor(){
    this.state.subscribe(s => this.currentState = s);
  }

  get connected() {
    return this.currentState === "CONNECTED";
  }

  connect(initiator, onSignal){
    this.state.next("CONNECTING");
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
      this.signals.pipe(first()).subscribe(onSignal);
    }
  }

  cleanup(){
    this.peer?.destroy();
  }

  onError(error){
    console.error(error);
    this.state.next({error});
  }

  onConnect(){
    console.log("Connected");
    this.state.next("CONNECTED");
  }

  onClose(){
    this.peer = null;
    console.log("Closed");
    this.state.next("CLOSED");
  }

  onSignal(signal){
    this.signals.next(signal);
  }

  onData(data){
    try {
      const {type, payload} = JSON.parse(data.toString());
      this.data.next({type, payload});
    } catch(err) {
      console.error(err, data);
    }
  }

  signal(signal, onCounterSignal){
    this.signals.pipe(first()).subscribe(onCounterSignal);
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