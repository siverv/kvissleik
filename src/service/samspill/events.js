import { createSignal, onCleanup } from 'solid-js';

export class EventStream {
  listeners = [];
  
  emit(event){
    for(let listener of this.listeners){
      listener(event);
    }
  }
  
  addListener(listener){
    this.listeners.push(listener);
    return this.removeListener.bind(this, listener);
  }
  
  removeListener(listener){
    let index = this.listeners.indexOf(listener);
    if(index >= 0){
      this.listeners.splice(index, 1);
    }
  }

  async next(predicate){
    return await new Promise(resolve => {
      let cleanup;
      cleanup = this.addListener((event) => {
        if(predicate ? predicate(event) : true){
          cleanup();
          resolve(event);
        }
      });
    });
  }

  intoSignal(signal){
    let set = Array.isArray(signal) ? signal[1] : signal;
    let removeListener = this.addListener(set);
    onCleanup(() => {
      removeListener();
    });
  }

  reduce(reducer, initialState){
    let signal = createSignal(initialState);
    this.addListener(event => {
      signal[1](reducer(event, signal[0]));
    });
    return signal;
  }
}