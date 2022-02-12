
import {createSignal, createRoot, onCleanup} from 'solid-js';
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

export async function observeNextPromise(observer, predicate, timeout = 20 * 1000){
  let promise = await new Promise((resolve, reject) => {
    createRoot((disposer) => {
      let timeoutId = setTimeout(() => {
        reject();
        disposer();
      }, 20 * 1000);
      let {unsubscribe} = observer.subscribe(data => {
        if(predicate(data)){
          resolve(data);
          disposer();
        }
      });
      onCleanup(() => {
        clearTimeout(timeoutId);
        unsubscribe();
      });
    })
  });
}
export function observeNext(observer, predicate, callback){
  return createRoot((disposer) => {
    let {unsubscribe} = observer.subscribe(data => {
      if(predicate(data)){
        callback(data);
        disposer();
      }
    });
    onCleanup(unsubscribe);
    return disposer;
  })
}

