
import { createSignal } from 'solid-js';
// TODO: Research better ways.

export function addSignal(object, name, initialValue, options){
  const signal = createSignal(initialValue, options);
  Object.defineProperties(object, {
    [name]: {
      get: signal[0],
      set: signal[1]
    },
    [name+"$"]: {
      value: signal[0]
    }
  });
}