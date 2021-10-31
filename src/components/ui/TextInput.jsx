import { untrack } from "solid-js";

function sanitizeInlineHTML(html){
  let parser = new DOMParser();
  let dom = parser.parseFromString(html, "text/html");
  function createElement(tagName){
    switch(tagName){
    case "STRONG":
    case "B": return dom.createElement("b");
    case "EMPH":
    case "I": return dom.createElement("i");
    case "U": return dom.createElement("u");
    case "S": return dom.createElement("s");
    case "BR": return dom.createElement("br");
    default:
    case "SPAN": return dom.createElement("span");
    }
  }
  function sanitizeElement(elm){
    let sanElm = createElement(elm.tagName);
    if(!sanElm){
      return null;
    }
    for(let child of elm.childNodes){
      if(child.nodeName === "#text"){
        sanElm.appendChild(child.cloneNode(true));
      } else {
        let sanChild = sanitizeElement(child);
        if(sanChild){
          if(sanChild.tagName === "SPAN"){
            for(let grandChild of sanChild.childNodes){
              sanElm.appendChild(grandChild);
            }
          } else {
            sanElm.appendChild(sanChild);
          }
        }
      }
    }
    return sanElm;
  }
  let sanElm = sanitizeElement(dom.body);
  return sanElm.innerHTML;
}


export function RichtextInput({signal: [html, setHtml]}){
  const onInput = (ev) => {
    let rawContent = ev.target.innerHTML;
    let sanitized = sanitizeInlineHTML(rawContent);
    if(sanitized !== rawContent){
      ev.target.innerHTML = sanitized;
    }
    setHtml(sanitized);
  };
  return <div
    className="input richtext-input"
    contenteditable
    onInput={onInput}
    innerHTML={untrack(html)}
  />;
}


export function PlaintextInput({signal: [text, setText]}){
  const onInput = (ev) => {
    setText(ev.target.innerText);
  };
  return <div
    className="input plaintext-input"
    contenteditable
    onInput={onInput}
    innerText={untrack(text)}
  />;
}
