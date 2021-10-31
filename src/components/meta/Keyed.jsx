import { createMemo } from "solid-js";

export function Keyed({key, children}){
  let previousKey = null;
  let previousElm = null;
  return createMemo(() => {
    let currentKey = key();
    if(currentKey === previousKey){
      return previousElm;
    } else {
      previousKey = currentKey;
      return previousElm = children(previousKey);
    }
  });
}
