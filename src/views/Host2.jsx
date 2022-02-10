import { QuizHostView } from "../components/quiz/QuizHostView";
import { HostForm } from "../components/form/HostForm";
import {batch, createSignal, createMemo, createResource, onCleanup, observable} from 'solid-js';
import {createStore} from 'solid-js/store';
import { HostedRoom } from '../service/samspillService';
import { HostedQuizController } from '../service/hostService2';
import { QuizState } from '../utils/controllerUtils';
import { DisplayQuiz } from '../components/ui/DisplayQuiz';
import { CopyToClipboardButton } from '../components/ui/CopyToClipboardButton';
import { createDummyQuiz } from "../service/makeService";
import { getQuizCollection } from "../service/storageService";
import {useSearchParams} from 'solid-app-router';
import "../components/form/HostForm.css";
import "../style/views.css";



function UnexpectedErrorWhileHosting({error, reset, quit}){
  return <>
    <details open>
      <summary>
        Something unexpected went wrong.
      </summary>
      <pre>
        {error}
      </pre>
    </details>
    <button onClick={reset}>
      Try to recover
    </button>
    <button onClick={() => setRoom(null)}>
      Quit
    </button>
  </>;
}

function HostingLobby({ctrl}){
  return <>
    <Show when={ctrl.getRoomCode()}>
      {code => <h3>
          Room code is {code}
        <CopyToClipboardButton getValue={() => code}>
          copy
        </CopyToClipboardButton>
      </h3>
      }
    </Show>
    <Show when={ctrl.getRoomLink()}>
      {link => <div>
        <b>Invite players by link: </b>
        <a href={link}>
          {link}
        </a>
        <CopyToClipboardButton getValue={() => link}>
          copy
        </CopyToClipboardButton>
      </div>}
    </Show>
    <Show when={ctrl.joinByPasting()}>
      <p>
        Enter the players signal below, then return them the resulting counter-signal.
      </p>
      <p>
        <textarea>
        </textarea>
        <button type="button">
          Accept signal
        </button>
      </p>
      <p>
        <textarea>
        </textarea>
        <button type="button">
          Copy counter-signal
        </button>
      </p>
    </Show>
    <p>
      {ctrl.getParticipants().length} joined out of {ctrl.getMaxParticipants()} possible.
    </p>
    <ul>
      <For each={ctrl.getParticipants()} fallback={"..."}>
        {participant => <li>
          {participant.name} {participant.connected ? "[CONNECTED]" : participant.connecting ? "[CONNECTING]" : "[DISCONNECTED]"}
          <button type="button" onClick={() => ctrl.kick(participant)}>
            Kick
          </button>
        </li>}
      </For>
    </ul>
    <button class="start-quiz" onClick={() => ctrl.start()}>
      Start quiz
    </button>
  </>;
}

function HostingQuestion({ctrl, question}){
  const next = () => ctrl.next();
  const escapeZen = (ev) => {
    if(ev.key === "Escape"){
      delete document.body.dataset.zen;
    }
  }
  document.body.dataset.zen = "true";
  window.addEventListener("click", next);
  window.addEventListener("keydown", escapeZen);
  onCleanup(() => {
    window.removeEventListener("click", next);
    window.removeEventListener("keydown", escapeZen);
    delete document.body.dataset.zen;
  });
  return <>
    <DisplayQuiz
      question={question}
      countdown={ctrl.countdown >= 0 ? <>{Math.floor(ctrl.countdown / 1000)}</> : null}
      details={ctrl.state.name === QuizState.ALTERNATIVE ? <>{ctrl.getNumberOfAnswered()}/{ctrl.room.participants.length}</> : undefined}
      correct={question.correct}
      statistics={question.statistics}
    />
    <p>
      Click anywhere to continue...
    </p>
    <aside>
      <ul>
        <For each={ctrl.getCurrentStandings()}>
          {({participantName, position, score, connected}) => <li>
            #{position}: {participantName}: {score}
            <Show when={!connected}>
              [DISCONNECTED];
            </Show>
          </li>}
        </For>
      </ul>
    </aside>
  </>
}

function DisplayFinalResults({results}) {
  return <>
    <h3>And the results are....</h3>
    <ul>
      <For each={results}>
        {({participantName, position, score, connected}) => <li>
          #{position}: {participantName}: {score}
          <Show when={!connected}>
            [DISCONNECTED];
          </Show>
        </li>}
      </For>
    </ul>
  </>
}

function Hosting({room, quit}){
  const ctrl = new HostedQuizController(room);
  return <ErrorBoundary fallback={(error, reset) => <UnexpectedErrorWhileHosting error={error} reset={reset} quit={quit}/>}>
    <section class="hosting-quiz">
      <Switch fallback={() => <HostingLobby ctrl={ctrl}/>}>
        <Match when={!ctrl.isConnected()}>
          <p>
            Reconnecting...
          </p>
        </Match>
        <Match when={ctrl.getCurrentQuestion()}>
          {(question) => <HostingQuestion ctrl={ctrl} question={question}/>}
        </Match>
        <Match when={ctrl.state.name === QuizState.RESULTS}>
          {(results) => <DisplayFinalResults results={results}/>}
        </Match>
        <Match when={ctrl.state.name === QuizState.THE_END}>
          <h3>
            Thank you for playing.
          </h3>
          <p>
            Want to share or save the results?
            <textarea>
            </textarea>
            <button type="button">
              copy results to clipboard.
            </button>
          </p>
          <p>
            Want to share or save the quiz?
            <textarea>
            </textarea>
            <button type="button">
              copy quiz to clipboard.
            </button>
          </p>
          <button type="button" onClick={quit}>
            Exit game
          </button>
        </Match>
      </Switch>
    </section>
    <aside>
      <button type="button" onClick={quit}>
        Quit
      </button>
    </aside>
  </ErrorBoundary>
}

function HostedRoomCreator({setRoom}){
  const [config, setConfig] = createSignal();
  const [room] = createResource(config, async (config, {value: room}) => {
    let ok = await room.initialize(config)
    if(ok){
      setRoom(room);
    }
    return room;
  }, {initialValue: new HostedRoom()});
  return <section class="room-creator">
    <HostConfigForm setConfig={setConfig}/>
    <Show when={room.loading}>
      Creating room...
    </Show>
    <Show when={room.error}>
      <details open>
        <summary>
          Problems creating room...
        </summary>
        <pre>
          {room.error.toString()}
        </pre>
      </details>
    </Show>
  </section>
}

export function Host(){
  let [room, setRoom] = createSignal(null);
  const quit = async () => {
    let currentRoom = room();
    setRoom(null);
    await currentRoom.destroy();
  }
  return <div class="view host-view">
    <Show when={room()}
      fallback={<HostedRoomCreator setRoom={setRoom}/>}>
      {(room) => <Hosting room={room} quit={quit}/>}
    </Show>
  </div>
}

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
function validateRoomCodeLength(roomCodeLength){
  if(isNaN(roomCodeLength)){
    return <>The room code length needs to be a number.</>;
  } else if(roomCodeLength < 4 || roomCodeLength > 128) {
    return "The room code length needs to be greater than 4";
  } else {
    return null;
  }
}
function validateSelectedQuiz(selectedQuiz, quiz){
  if(!quiz){
    return "Could not find selected quiz. Try another?";
  } else {
    return null;
  }
}

function validateConfig(config){
  const notes = {
    maxParticipants: validateMaxParticipants(config.maxParticipants),
    selectedQuiz: validateSelectedQuiz(config.selectedQuiz, config.quiz),
    roomCodeLength: validateRoomCodeLength(config.roomCodeLength)
  };
  notes.ok = Object.values(notes).filter(Boolean).length === 0;
  return notes;
}

function formToConfig(form){
  const config = {};
  const formData = new FormData(form);
  config.maxParticipants = parseInt(formData.get("maxParticipants"));
  config.signallingServer = formData.get("signallingServer");
  config.password = formData.get("password")?.trim() || null;
  config.stunServer = formData.get("stunServer");
  config.selectedQuiz = formData.get("selectedQuiz");
  config.roomCodeLength = parseInt(formData.get("roomCodeLength"));
  if(selectedQuiz === "DEFAULT"){
    config.quiz = createDummyQuiz();
  } else {
    config.quiz = getQuizCollection().get(config.selectedQuiz);
  }
  return config;
}

export function HostConfigForm({setConfig}){
  const [searchParams, setSearchParams] = useSearchParams();
  const quizCollection = getQuizCollection();
  const [notes, setNotes] = createStore({});
  const [showOptions, setShowOptions] = createSignal(true);
  function onSubmit(ev){
    ev.preventDefault();
    const config = formToConfig(ev.target);
    const validationNotes = validateConfig(config);
    if(validationNotes.ok){
      setSearchParams({
        maxParticipants: config.maxParticipants,
        quizId: config.selectedQuiz,
        stunServer: config.stunServer,
        signallingServer: config.signallingServer
      })
      setConfig(config);
    } else {
      setNotes(validationNotes);
    }
  }
  return <form class="host-form" onSubmit={onSubmit}>
    <div class="entry-group select-quiz">
      <label class="label" htmlFor="selectedQuiz">What do you want to play today?</label>
      <select id="selectedQuiz" name="selectedQuiz" value={searchParams.quizId}>
        <For each={quizCollection.list()} fallback={<option value="DEFAULT">The dummy quiz</option>}>
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
        <button type="button" onClick={() => setShowOptions(!showOptions())} data-active={showOptions() ? "yes" : undefined}>
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