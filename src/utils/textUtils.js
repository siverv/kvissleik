
const INLINE_WHITELIST = {
  "STRONG": "b",
  "B": "b",
  "EMPH": "i",
  "I": "i",
  "U": "u",
  "S": "s",
  "BR": "br",
  "DIV": "div",
  "SPAN": "span"
};

const BASIC_WHITELIST = {
  ...INLINE_WHITELIST,
  "BR": "br",
  "DIV": "div"
};

export function sanitizeHTML(html, whitelist = BASIC_WHITELIST){
  let parser = new DOMParser();
  let dom = parser.parseFromString(html, "text/html");
  function sanitizeElement(elm){
    let sanElm = dom.createElement(whitelist[elm.tagName] || "span");
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

export function sanitizePlaintext(potentialHtml){
  let parser = new DOMParser();
  let dom = parser.parseFromString(potentialHtml, "text/html");
  return dom.body.innerText;
}
  