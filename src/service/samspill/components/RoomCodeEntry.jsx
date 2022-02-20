import {createSignal, createMemo} from 'solid-js';
import './RoomCodeEntry.css';

export function FourSymbolCodeInput({initialValue, setMoreLetters}){
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
    let pastedCode = (ev.clipboardData || window.clipboardData).getData('text');
    pastedCode = pastedCode.toUpperCase().trim();
    if(pastedCode.length > 4){
      setMoreLetters(pastedCode);
      return;
    }
    let node = document.getElementById("code");
    for(let i = 0; i < 4; i++){
      node.value = pastedCode[i] || "";
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

export function RoomCodeEntry({initialValue, note}){
  const [moreLetters, setMoreLetters] = createSignal(initialValue?.length > 4);
  const getInitialValue = createMemo(() => {
    if(typeof moreLetters() === "string"){
      return moreLetters();
    } else {
      return initialValue || null;
    }
  })
  return <div class="room-code-entry entry-group code">
    <input type="hidden" name="code_moreLetters" value={moreLetters()}/>
    <label class="label" htmlFor="code">Enter the room code</label>
    <Show when={!moreLetters()}>
      <FourSymbolCodeInput initialValue={initialValue} setMoreLetters={setMoreLetters}/>
    </Show>
    <Show when={moreLetters()}>
      {() => <div class="long-code-entry">
        <div class="background">
          <div/><div/><div/><div/>
        </div>
        <input type="text" id="code"
          ref={elm => setTimeout(() => elm.focus(), 0)}
          autoFocus={true}
          name="longCode"
          placeholder="ABCDEF..."
          value={getInitialValue()}/>
      </div>}
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
