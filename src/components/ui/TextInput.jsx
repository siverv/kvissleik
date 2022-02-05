import { observable, untrack, onCleanup } from 'solid-js';
import { sanitizeHTML } from '../../utils/textUtils';

export function RichtextInput({getValue, setValue, class: className}){
  let previousSanitized;
  let element;
  const onInput = () => {
    let rawContent = element.innerHTML;
    let sanitized = sanitizeHTML(rawContent);
    if(sanitized !== rawContent){
      element.innerHTML = sanitized;
    }
    previousSanitized = sanitized;
    setValue(sanitized);
  };
  let {unsubscribe} = observable(getValue).subscribe((value) => {
    if(element === undefined){
      return;
    }
    if(previousSanitized !== value){
      element.innerHTML = value;
    }
  });
  onCleanup(() => {
    unsubscribe();
  });
  return <div
    ref={(elm) => {
      element = elm;
      let rawContent = element.innerHTML;
      previousSanitized = sanitizeHTML(rawContent);
    }}
    class={["input richtext-input"].concat(className||[]).filter(Boolean).join(" ")}
    contenteditable
    onInput={onInput}
    innerHTML={untrack(getValue)}
  />;
}

export function PlaintextInput({getValue, setValue, class: className}){
  let previousValue;
  let element;
  const onInput = (ev) => {
    previousValue = ev.target.innerText;
    setValue(previousValue);
  };
  let {unsubscribe} = observable(getValue).subscribe((value) => {
    if(element === undefined || previousValue === undefined){
      return;
    }
    if(previousValue !== value){
      element.innerText = value;
    }
  });
  onCleanup(() => {
    unsubscribe();
  });
  return <div
    ref={(elm) => {
      element = elm;
      previousValue = elm.innerText;
    }}
    class={["input plaintext-input"].concat(className||[]).filter(Boolean).join(" ")}
    contenteditable
    onInput={onInput}
    innerText={untrack(getValue)}
  />;
}