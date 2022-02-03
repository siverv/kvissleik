import { QuizHostView } from "../components/quiz/QuizHostView";
import {batch, createSignal} from 'solid-js';
import {createHostedRoom} from '../service/p2pService';
import { hasSavedQuiz, loadQuizInHostableFormat } from "../service/makeService";
import "./View.css";
import "./Host.css";

export function HostView(){
  let [room, setRoom] = createSignal(null);
  let [quiz, setQuiz] = createSignal(null);
  let [numNote, setNumNote] = createSignal(null);
  function onSubmit(ev){
    ev.preventDefault();
    let formData = new FormData(ev.target);
    let selectedQuiz = parseInt(formData.get("selectedQuiz"));
    let maxParticipants = parseInt(formData.get("maxParticipants"));
    let numNote = null;
    if(isNaN(maxParticipants)){
      numNote = <>Max number of players needs to a <i>number</i>. It's in the name.</>;
    } else if(maxParticipants < 1) {
      numNote = "A quiz with less than one player is not a fun quiz...";
    } else if(maxParticipants > 65000) {
      numNote = "I think there is a techincal limit around 65k somewhere...";
    }
    setNumNote(numNote);
    if(numNote){
      return;
    }
    localStorage.setItem("previousNum", maxParticipants);
    localStorage.setItem("previousQuiz", selectedQuiz);
    batch(() => {
      setQuiz(loadQuizInHostableFormat(selectedQuiz));
      setRoom(createHostedRoom({settings: {maxParticipants}}));
    });
  }
  return <div class="view host-view">
    <Switch>
      <Match when={room() === null}>
        <form onSubmit={onSubmit}>
          <div class="entry-group select-quiz">
            <label class="label" htmlFor="select-quiz">What do you want to play today?</label>
            <select id="select-quiz" name="select-quiz" value={hasSavedQuiz() ? "SAVED" : "DEFAULT"}>
              <option value="DEFAULT">
                The dummy quiz
              </option>
              <Show when={hasSavedQuiz()}>
                <option value="SAVED">
                  The single saved quiz
                </option>
              </Show>
            </select>
          </div>
          <div class="entry-group maxParticipants">
            <label class="label" htmlFor="maxParticipants">How many is not yet too many?</label>
            <input id="maxParticipants" type="number" min="1" max="60000" step="1" name="maxParticipants" value={localStorage.getItem("previousNum") || "8"}/>
            <div/>
            <div/>
            <b class="note">
              {numNote()}
            </b>
          </div>
          <div class="entry-group host">
            <div/>
            <button type="submit" class="host-button">
              Host!
            </button>
            <div class="options">
              <button type="button">more options</button>
            </div>
          </div>
        </form>
      </Match>
      <Match when={room()?.connected !== true}>
        CONNECTING...
      </Match>
      <Match when={room() !== null}>
        <h3>
          Room code: {room().roomCode}
        </h3>
        <QuizHostView room={room()} quiz={quiz()}/>
      </Match>
    </Switch>
  </div>;
}
