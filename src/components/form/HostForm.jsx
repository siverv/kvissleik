import {createSignal} from 'solid-js';
import {createStore} from 'solid-js/store';
import { createDummyQuiz } from "../../service/makeService";
import { getQuizCollection } from "../../service/storageService";
import {useSearchParams} from 'solid-app-router';
import "./HostForm.css";

function validateMaxParticipants(maxParticipants){
  if(isNaN(maxParticipants)){
    return <>Max number of players needs to a <i>number</i>. It's in the name.</>;
  } else if(maxParticipants < 1) {
    return "A quiz with less than one player is not a fun quiz...";
  } else if(maxParticipants > 65000) {
    return "I think there is a techincal limit around 65k somewhere...";
  } else {
    return null;
  }
}
function validateSelectedQuiz(selectedQuiz){
  if(!selectedQuiz){
    return "Could not find selected quiz. Try another?";
  } else {
    return null;
  }
}

export function HostForm({startQuiz}){
  const [searchParams, setSearchParams] = useSearchParams();
  const quizCollection = getQuizCollection();
  const [notes, setNotes] = createStore({});
  const [showOptions, setShowOptions] = createSignal(true);
  //const room = createRoom();
  function onSubmit(ev){
    ev.preventDefault();
    let formData = new FormData(ev.target);

    let maxParticipants = parseInt(formData.get("maxParticipants"));
    setNotes("maxParticipants", validateMaxParticipants(maxParticipants));

    let signallingServer = formData.get("signallingServer");
    let stunServer = formData.get("stunServer");


    let quiz;
    let selectedQuiz = formData.get("selectedQuiz");
    if(selectedQuiz === "DEFAULT"){
      quiz = createDummyQuiz();
      notes.selectedQuiz = null;
    } else {
      quiz = quizCollection.get(selectedQuiz);
    }
    setNotes("selectedQuiz", validateSelectedQuiz(quiz));

    if(notes.maxParticipants || notes.selectedQuiz){
      return;
    }
    setSearchParams({
      maxParticipants,
      quizId: selectedQuiz,
      stunServer,
      signallingServer
    });
    startQuiz(quiz, {
      maxParticipants,
      signallingServer,
      stunServer
    });
  }
  return <form class="host-form" onSubmit={onSubmit}>
    <div class="entry-group select-quiz">
      <label class="label" htmlFor="selectedQuiz">What do you want to play today?</label>
      <select id="selectedQuiz" name="selectedQuiz" value={searchParams.quizId}>
        <For each={quizCollection.list()} fallback={<option value="DEFAULT">
          The dummy quiz
        </option>}>
          {(quiz) => {
            return <option value={quiz.id}>
              {quiz.name}
            </option>;
          }}
        </For>
      </select>
      <div/>
      <div/>
      <b class="note">
        {notes.selectedQuiz}
      </b>
    </div>
    <div class="entry-group maxParticipants">
      <label class="label" htmlFor="maxParticipants">How many is not yet too many?</label>
      <input id="maxParticipants" type="number" min="1" max="60000" step="1" name="maxParticipants" value={searchParams.maxParticipants || "8"}/>
      <div/>
      <div/>
      <b class="note">
        {notes.maxParticipants}
      </b>
    </div>
    <div class="entry-group host">
      <div/>
      <button type="submit" class="host-button">
        Host!
      </button>
      <div class="options">
        <button type="button" onClick={() => setShowOptions(!showOptions())}data-active={showOptions() ? "yes" : undefined}>
          {showOptions() ? "less" : "more"} options
        </button>
      </div>
    </div>
    <details open={showOptions() ? "yes" : undefined}>
      <summary style="display:none;"/>
      <div class="entry-group">
        <label class="label" htmlFor="password">Password?</label>
        <input id="password" name="password" type="password"/>
        <div/>
        <b class="note">
          {notes.password}
        </b>
      </div>
      <div class="entry-group more">
        <label class="label" htmlFor="signallingServerGroup">How to find your players?</label>
        <div id="signallingServerGroup" class="radio-group">
          <input type="radio" name="signallingServer" id="signalling_ABCD" value="ABCD" checked/>
          <label title="A random room code on the Samspill signalling server." class="radio-group-button" htmlFor="signalling_ABCD">
            Room Code
          </label>
          <input type="radio" name="signallingServer" id="signalling_SECURE" value="SECURE" checked/>
          <label title="A secret is needed to connect on the Samspill signalling server, which must be shared as a link." class="radio-group-button" htmlFor="signalling_SECURE">
            Hidden Room
          </label>
          <input type="radio" name="signallingServer" id="signalling_COPYPASTE" value="COPYPASTE" checked/>
          <label title="Connection to players is established by copying and pasting the signal-objects manually" class="radio-group-button" htmlFor="signalling_COPYPASTE">
            Copy-paste
          </label>
        </div>
        <div/>
        <div/>
        <b class="note">
          {notes.more}
        </b>
      </div>
      <div class="entry-group">
        <label class="label" htmlFor="roomCodeLength">Room Code Length</label>
        <input id="roomCodeLength" name="roomCodeLength" type="number" step="1" min="4" max="128" value="4"/>
        <div/>
        <b class="note">
          {notes.roomCodeLength}
        </b>
      </div>
      <div class="entry-group more">
        <label class="label" htmlFor="stunServer" title="A STUN-server is used to help connect you to your players when they share IP-addresses with other people. Recommended for most people.">STUN-server</label>
        <select id="stunServer" name="stunServer">
          <option value="NONE">
            No STUN
          </option>
          <option value="STUN" selected>
            STUN
          </option>
          {/*<option value="STUN_TURN">
            STUN/TURN
          </option>*/}
        </select>
      </div>
    </details>
  </form>;
}