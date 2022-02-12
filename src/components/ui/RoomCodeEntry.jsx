import {createSignal, createMemo} from 'solid-js';
import './RoomCodeEntry.css';

export function FourSymbolCodeInput({initialValue}){
  const ifFilledMoveToNext = (ev) => {
    ev.target.value = ev.target.value.toUpperCase();
    if(ev.target.nextSibling && ev.target.value.length >= 1){
      let next = ev.target.nextSibling;
      next.focus();
      next.select();
    }
  };
  const moveWithArrows = (ev) => {
    let sibling = null;
    if(ev.key === "ArrowLeft"){
      sibling = ev.target?.previousSibling || ev.target;
    } else if(ev.key === "ArrowRight"){
      sibling = ev.target?.nextSibling || ev.target;
    } else if(ev.key === "Backspace" && ev.target.value.length === 0) {
      sibling = ev.target?.previousSibling || ev.target;
      sibling.value = "";
    }
    sibling?.focus();
    sibling && setTimeout(() => sibling.select(), 5);
  };
  const onPaste = (ev) => {
    ev.preventDefault();
    let paste = (ev.clipboardData || window.clipboardData).getData('text');
    paste = paste.toUpperCase().replace(/\s+/g, "");
    let node = document.getElementById("code-first-letter");
    for(let i = 0; i < 4; i++){
      node.value = paste[i];
      node.focus();
      node = node.nextSibling;
    }
  };
  const Input = (props) => {
    return <input type="text"
      name="code"
      onPaste={onPaste}
      onClick={(ev) => ev.target.select()}
      onKeyDown={moveWithArrows}
      onInput={ifFilledMoveToNext}
      maxLength={1}
      {...props}
    />
  }
  return <div class="code-entry-input">
    <Input autofocus={true} id="code" placeholder="A" value={initialValue?.[0]}/>
    <Input placeholder="B" value={initialValue?.[1]}/>
    <Input placeholder="C" value={initialValue?.[2]}/>
    <Input placeholder="D" value={initialValue?.[3]}/>
  </div>
}

export function RoomCodeEntry({initialValue, initialMoreLetters, note}){
  const [moreLetters, setMoreLetters] = createSignal(initialMoreLetters);
  return <div class="entry-group code">
    <input type="hidden" name="code_moreLetters" value={moreLetters()}/>
    <label class="label" htmlFor="code">Enter the room code</label>
    <Show when={!moreLetters()}>
      <FourSymbolCodeInput initialValue={initialValue}/>
    </Show>
    <Show when={moreLetters()}>
      <div class="long-code-entry">
        <div class="background">
          <div/><div/><div/><div/>
        </div>
        <input type="text" id="code"
          name="longCode"
          placeholder="ABCDEF..."
          value={initialValue || null}/>
      </div>
    </Show>
    <div>
      <button type="button" onClick={() => setMoreLetters(!moreLetters())}>
        {moreLetters() ? "Less" : "More"} letters...
      </button>
    </div>
    <div/>
    <b class="note">
      {note}
    </b>
  </div>
}
RoomCodeEntry.parseFormData = function (formData) {
  let moreLetters = formData.get("code_moreLetters") === "true";
  if(moreLetters) {
    return formData.get("longCode").toUpperCase();
  } else {
    return formData.getAll("code").join("").toUpperCase();
  }
}
