import { QuizHostView } from "../components/quiz/QuizHostView";
import {batch, createSignal} from 'solid-js';
import {createHostedRoom} from '../service/p2pService';
import { createDummyQuiz } from "../service/makeService";
import { createQuizCollection } from "../service/storageService";
import "./View.css";
import "./Host.css";

export function HostView(){
  let quizCollection = createQuizCollection();
  let [room, setRoom] = createSignal(null);
  let [quiz, setQuiz] = createSignal(null);
  let [numNote, setNumNote] = createSignal(null);
  let [quizNote, setQuizNote] = createSignal(null);
  function onSubmit(ev){
    ev.preventDefault();
    let formData = new FormData(ev.target);
    let selectedQuiz = formData.get("selectedQuiz");
    let maxParticipants = parseInt(formData.get("maxParticipants"));
    let numNote = null;
    if(isNaN(maxParticipants)){
      numNote = <>Max number of players needs to a <i>number</i>. It's in the name.</>;
    } else if(maxParticipants < 1) {
      numNote = "A quiz with less than one player is not a fun quiz...";
    } else if(maxParticipants > 65000) {
      numNote = "I think there is a techincal limit around 65k somewhere...";
    }
    let quiz, quizNote = null;
    if(selectedQuiz === "DEFAULT"){
      quiz = createDummyQuiz();
    } else {
      quiz = quizCollection.get(selectedQuiz);
      console.log("quiz 2", quiz, selectedQuiz);
      if(!quiz){
        quizNote = "Could not find selected quiz. Try another?";
      }
    }
    setNumNote(numNote);
    setQuizNote(quizNote);
    if(numNote || quizNote){
      return;
    }
    localStorage.setItem("previousNum", maxParticipants);
    localStorage.setItem("previousQuiz", selectedQuiz);
    batch(() => {
      console.log("quiz", quiz);
      setQuiz(quiz);
      setRoom(createHostedRoom({settings: {maxParticipants}}));
    });
  }
  return <div class="view host-view">
    <Switch>
      <Match when={room() === null}>
        <form onSubmit={onSubmit}>
          <div class="entry-group select-quiz">
            <label class="label" htmlFor="selectedQuiz">What do you want to play today?</label>
            <select id="selectedQuiz" name="selectedQuiz" value={localStorage.getItem("previousQuiz")}>
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
              {quizNote()}
            </b>
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
