import { QuizPlayView } from "../components/quiz/QuizPlayView";
import {createSignal} from "solid-js";
//import {createJoinedRoom} from '../service/p2pService';
import "../style/views.css";
import './Play.css';
import { createJoinedRoom } from '../service/samspillService';

export function Play(){
  const [room, {refetch: retryRoom}] = createJoinedRoom(null);
  const [nameNote, setNameNote] = createSignal(null && "Name needs to be between 1 and 20 characters");
  const [codeNote, setCodeNote] = createSignal(null && "No room by this code");
  const [moreLetters, setMoreLetters] = createSignal(false);
  const onSubmit = async (ev) => {
    ev.preventDefault();
    let formData = new FormData(ev.target);
    let name = formData.get("name");
    let code;
    if(moreLetters()){
      code = formData.get("longCode").join("").toUpperCase();
    } else {
      code = formData.getAll("code").join("").toUpperCase();
    }
    let badName = null;
    if(!name?.match(/^.{1,20}$/)){
      badName = "Name needs to be between 1 and 20 characters";
    }
    let badCode = null;
    if(code?.length !== 4){
      badCode = "Code needs to be 4 letters";
    }
    setNameNote(badName);
    setCodeNote(badCode);
    if(badName || badCode){
      return;
    }
    localStorage.setItem("previousName", name);
    localStorage.setItem("previousCode", code);
    let password = null;
    retryRoom({password, name, roomCode: code, ...config})
  };
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

  return <div class="view play-view">
    <Switch>
      <Match when={room() === null || room()?.canJoinRoom()}>
        <form onSubmit={onSubmit}>
          <div class="entry-group code">
            <label class="label" htmlFor="code">Enter the room code</label>
            <Show when={!moreLetters()}>
              <div class="code-entry-input">
                <input autofocus={true} id="code" name="code" onPaste={onPaste} onClick={(ev) => ev.target.select()} onKeyDown={moveWithArrows} onInput={ifFilledMoveToNext} type="text" maxLength={1} placeholder="A"></input>
                <input type="text" name="code" onPaste={onPaste} onClick={(ev) => ev.target.select()} onKeyDown={moveWithArrows} onInput={ifFilledMoveToNext} maxLength={1} placeholder="B"></input>
                <input type="text" name="code" onPaste={onPaste} onClick={(ev) => ev.target.select()} onKeyDown={moveWithArrows} onInput={ifFilledMoveToNext} maxLength={1} placeholder="C"></input>
                <input type="text" name="code" onPaste={onPaste} onClick={(ev) => ev.target.select()} onKeyDown={moveWithArrows} onInput={ifFilledMoveToNext} maxLength={1} placeholder="D"></input>
              </div>
            </Show>
            <Show when={moreLetters()}>
              <div class="long-code-entry">
                <div class="background">
                  <div/><div/>
                  <div/><div/>
                </div>
                <input type="text" id="code" name="longCode" placeholder="ABCDEF..."/>
              </div>
            </Show>
            <div>
              <button type="button" onClick={() => setMoreLetters(!moreLetters())}>
                {moreLetters() ? "Less" : "More"} letters...
              </button>
            </div>
            <div/>
            <b class="note">
              {codeNote}
            </b>
          </div>
          <div class="entry-group name">
            <label class="label" htmlFor="name-entry-input">Hello, my name is</label>
            <input id="name-entry-input" name="name" type="text" minLength={1} maxLength={20} placeholder="Jack and/or Jill"></input>
            <div/>
            <div/>
            <b class="note">
              {nameNote}
            </b>
          </div>
          <div class="entry-group play">
            <div/>
            <button type="submit" class="play-button">
              Play!
            </button>
            <div class="options">
              <button type="button">more options</button>
            </div>
            <Show when={room()?.deniedForReason}>
              <div/>
              <b class="note">
                {room().deniedForReason}
              </b>
            </Show>
          </div>
        </form>
      </Match>
      <Match when={room()?.isJoiningRoom()}>
        Joining room...
      </Match>
      <Match when={room()?.inRoom()}>
        <QuizPlayView room={room()}/>
      </Match>
    </Switch>
  </div>;
}
