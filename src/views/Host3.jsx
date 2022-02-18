import { QuizHostView } from "../components/quiz/QuizHostView";
import { HostForm } from "../components/form/HostForm";
import {batch, createSignal, createMemo, createResource, onCleanup, observable} from 'solid-js';
import {createStore} from 'solid-js/store';
// import { HostedRoom } from '../service/samspillService';
import { HostedQuizController } from '../service/hostService2';
import { QuizState } from '../utils/controllerUtils';
import { DisplayQuiz } from '../components/ui/DisplayQuiz';
import { CopyToClipboardButton } from '../components/ui/CopyToClipboardButton';
import { createDummyQuiz } from "../service/makeService";
import { getQuizCollection } from "../service/storageService";
import { SamspillHost } from '../service/samspillService';
import {useSearchParams} from 'solid-app-router';
import {RadioGroup} from '../components/ui/RadioGroup';
import DefaultSignallingServer, {getSignallingServer, getSignallingServerOptions} from '../service/signalling';
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
    <button onClick={quit}>
      Quit
    </button>
  </>;
}

function HostingLobby({ctrl}){
  return <>
    <Dynamic component={ctrl.room.server.constructor.HostConnectionDetails} server={ctrl.room.server}/>
    <p>
      {ctrl.getParticipants().length} joined out of {ctrl.getMaxParticipants()} possible.
    </p>
    <ul>
      <For each={ctrl.getParticipants()} fallback={"..."}>
        {participant => <li>
          {participant.name} [{participant.state}]
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
          {({participantName, position, score, connectionState}) => <li>
            #{position}: {participantName}: {score}
            [{connectionState}]
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
        {({participantName, position, score, connectionState}) => <li>
          #{position}: {participantName}: {score}
            [{connectionState}]
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
          {() => <DisplayFinalResults results={ctrl.getCurrentStandings()}/>}
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
    let ok = await room.initialize(config);
    if(ok){
      setRoom(room);
    }
    return room;
  }, {initialValue: new SamspillHost()});
  return <section class="room-creator">
    <HostConfigForm setConfig={setConfig}/>
    <Show when={room.loading}>
      Creating room...
    </Show>
    <Show when={room.error}>
      {(error) => {
        console.error(error);
        return <details open>
          <summary>
            Problems creating room...
          </summary>
          <pre>
            {room.error.toString()}
          </pre>
        </details>
      }}
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
function validateSelectedQuiz(selectedQuiz, quiz){
  if(!quiz){
    return "Could not find selected quiz. Try another?";
  } else {
    return null;
  }
} 

function formToConfig(form, setValidationNotes){
  let ok = true;
  const config = {};
  const formData = new FormData(form);
  let searchParams = {};
  
  searchParams.maxParticipants = config.maxParticipants = parseInt(formData.get("maxParticipants"));
  ok &&= setValidationNotes("maxParticipants", validateMaxParticipants(config.maxParticipants));
  searchParams.quizId = config.selectedQuiz = formData.get("selectedQuiz");
  if(config.selectedQuiz === "DEFAULT"){
    config.quiz = createDummyQuiz();
  } else {
    config.quiz = getQuizCollection().get(config.selectedQuiz);
  }
  ok &&= setValidationNotes("selectedQuiz", validateSelectedQuiz(config.selectedQuiz, config.quiz));


  searchParams.signallingServer = config.signallingServer = formData.get("signallingServer");
  let Server = getSignallingServer(config.signallingServer);
  console.log(config.signallingServer, Server)
  let [connectionConfig, connectionConfigValidation, connectionSearchParams] = Server.HostConfigurationInput.parseFormData(formData);
  Object.assign(config, connectionConfig);
  ok &&= setValidationNotes("HostConfigurationInput", connectionConfigValidation);

  Object.assign(searchParams, connectionSearchParams)

  searchParams.stunServer = config.stunServer = formData.get("stunServer");

  return [config, ok, searchParams];
}

export function HostConfigForm({setConfig}){
  const [searchParams, setSearchParams] = useSearchParams();
  const quizCollection = getQuizCollection();
  const [notes, setNotes] = createStore({});
  const [showOptions, setShowOptions] = createSignal(true);
  const [signallingServer, setSignallingServer] = createSignal({server: getSignallingServer("TEST")});
  const onSignallingServerChanged = (ev) => {
    let type = ev.target.value;
    setSignallingServer({server: getSignallingServer(type)});
  }
  const setValidationNotes = (field, notes) => {
    setNotes(field, notes);
    console.log(notes)
    return !notes;
  }
  function onSubmit(ev){
    ev.preventDefault();
    const [config, ok, searchParams] = formToConfig(ev.target, setValidationNotes);
    if(ok){
      setSearchParams({
        ...searchParams
      })
      setConfig(config);
    }
  }
  return <form class="host-form" onSubmit={onSubmit}>
    <div name="test">
    </div>
    <div class="entry-group select-quiz">
      <label class="label" htmlFor="selectedQuiz">What do you want to play today?</label>
      <select id="selectedQuiz" name="selectedQuiz">
        <For each={quizCollection.list()} fallback={<option value="DEFAULT" selected>The dummy quiz</option>}>
          {(quiz) => {
            return <option value={quiz.id} selected={searchParams.quizId == quiz.id}>
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
      <hr/>
      <h3>Signalling server configuration</h3>
      <div class="entry-group more">
        <label class="label" htmlFor="signallingServerGroup">How to find your players?</label>
        <RadioGroup name="signallingServer" initialValue={searchParams.signallingServer || DefaultSignallingServer.SIGNALLING_SERVER_ID} options={getSignallingServerOptions()} onInput={onSignallingServerChanged}/>
        <div/>
        <div/>
        <b class="note">
          {notes.more}
        </b>
      </div>
      <Show when={signallingServer()?.server}>
        {(server) => <Dynamic component={server.HostConfigurationInput} validationNotes={notes.HostConfigurationInput}/>}
      </Show>
      <hr/>
      <h3>
        P2P communication configuration
      </h3>
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