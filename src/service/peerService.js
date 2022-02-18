
import {createSignal, observable, createReaction} from 'solid-js';
import {observeNext} from '../utils/solidUtils';
import {Subject, first} from 'rxjs';
import * as rxjs from 'rxjs';

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
    this.state.next("CONNECTING", {initiator, onSignal});
    // eslint-disable-next-line no-undef
    this.peer = new SimplePeer({
      initiator,
      trickle: false
    });
    this.peer.on('error', this._onError);
    this.peer.on('signal', this._onSignal);
    this.peer.on('connect', this._onConnect);
    this.peer.on('data', this._onData);
    if(onSignal){
      this.signals.pipe(first()).subscribe(onSignal);
    }
  }

  cleanup(){
    this.peer.close();
  }

  _onError = this.onError.bind(this);
  onError(err){
    console.error("Peer:", err);
    this.state.next(err);
  }

  _onConnect = this.onConnect.bind(this);
  onConnect(){
    console.log("CONNECTED");
    this.state.next("CONNECTED");
  }

  _onClose = this.onClose.bind(this);
  onClose(){
    this.peer = null;
    this.state.next("CLOSED");
    console.log("close");
  }

  _onSignal = this.onSignal.bind(this);
  onSignal(signal){
    console.log("signal", signal);
    this.signals.next(signal);
  }

  _onData = this.onData.bind(this);
  onData(data){
    try {
      console.log("on data", data);
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


