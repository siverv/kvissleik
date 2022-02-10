import { QuizPlayView } from "../components/quiz/QuizPlayView";
import {createSignal, onCleanup, createResource, createMemo} from "solid-js";
import { createStore } from "solid-js/store";
import "../style/views.css";
import './Play.css';
import { JoinedRoom } from '../service/samspillService';
import {useSearchParams} from 'solid-app-router';


export function Playing({room, quit}){
  return null;
}

export function Play(){
  let [room, setRoom] = createSignal(null);
  return <div class="view play-view">
    <Show when={room()}
      fallback={<JoinedRoomCreator setRoom={setRoom}/>}>
      {(room) => <Playing room={room} quit={() => setRoom(null)}/>}
    </Show>
  </div>
}

export function JoinedRoomCreator({setRoom}){
  const [config, setConfig] = createSignal();
  const [denied, setDenied] = createSignal();
  const [room] = createResource(config, async (config, {value: room}) => {
    let denied = await room.initialize(config)
    if(!denied){
      setRoom(room);
    }
    return room;
  }, {initialValue: new JoinedRoom()});
  return <section class="room-creator">
    <JoinConfigForm isLoading={createMemo(() => room.loading)} setConfig={setConfig} denied={denied}/>
    <Show when={room.loading}>
      Joining room...
    </Show>
    <Show when={room.error}>
      <details open>
        <summary>
          Problems joining room...
        </summary>
        <pre>
          {room.error.toString()}
        </pre>
      </details>
    </Show>
  </section>
}



function FourSymbolCodeInput({initialValue}){
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

function validateCode(code){
  if(code.length < 4){
    return "Code needs to be 4 or more letters";
  }
}
function validateName(name){
  if(!name){
    return "You need a name"
  } else if(!name.match(/^.{1,20}$/)){
    return "Name needs to be between 1 and 20 characters";
  }
}

function validateConfig(config){
  const notes = {
    code: validateCode(config.code),
    name: validateName(config.name)
  };
  notes.ok = Object.values(notes).filter(Boolean).length === 0;
  return notes;
}

function formToConfig(form, moreLetters){
  const config = {};
  const formData = new FormData(form);
  config.name = formData.get("name");
  if(moreLetters){
    config.code = formData.get("longCode").join("").toUpperCase();
  } else {
    config.code = formData.getAll("code").join("").toUpperCase();
  }
  return config;
}


export function JoinConfigForm({isLoading, setConfig, denied}){
  const [searchParams, setSearchParams] = useSearchParams();
  const [notes, setNotes] = createStore({});
  const [showOptions, setShowOptions] = createSignal(true);
  const [moreLetters, setMoreLetters] = createSignal(false);
  function onSubmit(ev){
    ev.preventDefault();
    if(isLoading()){
      return;
    }
    const config = formToConfig(ev.target, moreLetters());
    const validationNotes = validateConfig(config);
    if(validationNotes.ok){
      setSearchParams({
        code: config.code,
        name: config.name,
      })
      setConfig(config);
    } else {
      setNotes(validationNotes);
    }
  }
  return <form onSubmit={onSubmit}>
    <div class="entry-group code">
      <label class="label" htmlFor="code">Enter the room code</label>
      <Show when={!moreLetters()}>
        <FourSymbolCodeInput initialValue={searchParams.code}/>
      </Show>
      <Show when={moreLetters()}>
        <div class="long-code-entry">
          <div class="background">
            <div/><div/><div/><div/>
          </div>
          <input type="text" id="code" name="longCode" placeholder="ABCDEF..." value={searchParams.code}/>
        </div>
      </Show>
      <div>
        <button type="button" onClick={() => setMoreLetters(!moreLetters())}>
          {moreLetters() ? "Less" : "More"} letters...
        </button>
      </div>
      <div/>
      <b class="note">
        {notes.code}
      </b>
    </div>
    <div class="entry-group name">
      <label class="label" htmlFor="name-entry-input">Hello, my name is</label>
      <input id="name-entry-input" name="name" type="text" minLength={1} maxLength={20} placeholder="Jack and/or Jill" value={searchParams.name}></input>
      <div/>
      <div/>
      <b class="note">
        {notes.name}
      </b>
    </div>
    <div class="entry-group play">
      <div/>
      <button type="submit" class="play-button" disabled={isLoading() ? "yes" : undefined} >
        Play!
      </button>
      <div class="options">
        <button type="button" onClick={() => setShowOptions(!showOptions())} data-active={showOptions() ? "yes" : undefined}>
          {showOptions() ? "less" : "more"} options
        </button>
      </div>
      <Show when={denied}>
        <div/>
        <b class="note">
          {denied}
        </b>
      </Show>
    </div>
  </form>;
}
