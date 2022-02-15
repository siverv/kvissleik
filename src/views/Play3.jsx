import { QuizPlayView } from "../components/quiz/QuizPlayView";
import {createSignal, onCleanup, createResource, createMemo, Switch, Match} from "solid-js";
import { createStore, unwrap } from "solid-js/store";
import "../style/views.css";
import './Play.css';
import { SamspillParticipant } from '../service/samspillService';
import { JoinedQuizController } from '../service/playService';
import {useSearchParams} from 'solid-app-router';
import { DisplayQuiz } from '../components/ui/DisplayQuiz';
import { QuizState } from '../utils/controllerUtils';
import {RadioGroup} from '../components/ui/RadioGroup';
import defaultServer, {getSignallingServer, getSignallingServerOptions} from '../service/signalling';

function UnexpectedErrorWhilePlaying({error, reset, quit}){
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


function PlayingLobby({ctrl}){
  return <>
    <h3>
      Waiting for host to start game.
    </h3>
    <Show when={ctrl.roomInfo}>
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
    </Show>
  </>;
}

function PlayingQuestion({ctrl, question}){
  const escapeZen = (ev) => {
    if(ev.key === "Escape"){
      delete document.body.dataset.zen;
    }
  }
  document.body.dataset.zen = "true";
  window.addEventListener("keydown", escapeZen);
  onCleanup(() => {
    window.removeEventListener("keydown", escapeZen);
    delete document.body.dataset.zen;
  });
  const getAnswer = createMemo(() => ctrl.answerMap.get(ctrl.state.data.questionId));
  return <>
    <DisplayQuiz
      question={question}
      countdown={ctrl.countdown >= 0 ? <>{Math.floor(ctrl.countdown / 1000)}</> : null}
      correct={question.correct}
      statistics={question.statistics}
      getAnswer={getAnswer}
      getScore={createMemo(() => ctrl.score.questionId == ctrl.state.data.questionId ? ctrl.score : undefined)}
      Alternative={ctrl.state.name === "ALTERNATIVES" ? (props) => <button {...props}
        disabled={getAnswer() || undefined}
        onClick={() => {
          ctrl.setAnswer(question.alternatives[props.index()].id);
        }}
      /> : undefined}
    />
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
    <h3>You are #{results.position} with a score of {results.score}</h3>

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

function Playing({room, quit}){
  const ctrl = new JoinedQuizController(room);
  return <ErrorBoundary fallback={(error, reset) => <UnexpectedErrorWhilePlaying error={error} reset={reset} quit={quit}/>}>
    <section class="hosting-quiz">
      <Switch fallback={() => <PlayingLobby ctrl={ctrl}/>}>
        <Match when={!ctrl.isConnected()}>
          <p>
            Reconnecting...
          </p>
        </Match>
        <Match when={ctrl.getCurrentQuestion()}>
          {(question) => <PlayingQuestion ctrl={ctrl} question={question}/>}
        </Match>
        <Match when={ctrl.state.name === QuizState.RESULTS}>
          {() => <DisplayFinalResults results={ctrl.getCurrentStandings()}/>}
        </Match>
        <Match when={false}>
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
    } else {
      setDenied(denied);
    }
    return room;
  }, {initialValue: new SamspillParticipant()});
  return <section class="room-creator">
    <JoinConfigForm isLoading={createMemo(() => room.loading)} setConfig={setConfig} denied={denied}/>
    <Show when={room.loading}>
      Joining room...
    </Show>
    <Show when={room.error}>
      {(error) => {
        console.error(error);
        return <details open>
          <summary>
            Problems joining room...
          </summary>
          <pre>
            {room.error.toString()}
          </pre>
        </details>
      }}
    </Show>
  </section>
}

function validateName(name){
  if(!name){
    return "You need a name"
  } else if(!name.match(/^.{1,20}$/)){
    return "Name needs to be between 1 and 20 characters";
  }
}

function formToConfig(form, setValidationNotes){
  let ok = true;
  const config = {};
  const formData = new FormData(form);
  let searchParams = {};
  
  searchParams.name = config.name = formData.get("name");
  ok &&= setValidationNotes("name", validateName(config.name));

  searchParams.signallingServer = config.signallingServer = formData.get("signallingServer");
  let server = getSignallingServer(config.signallingServer);
  let [connectionConfig, connectionConfigValidation, connectionSearchParams] = server.ParticipantConnectionInput.parseFormData(formData);
  config.connectionConfig = connectionConfig;
  ok &&= setValidationNotes("ParticipantConnectionInput", connectionConfigValidation);
  Object.assign(searchParams, connectionSearchParams);

  searchParams.stunServer = config.stunServer = formData.get("stunServer");

  return [config, ok, searchParams];
}


export function JoinConfigForm({isLoading, setConfig, denied}){
  const [searchParams, setSearchParams] = useSearchParams();
  const [notes, setNotes] = createStore({});
  const [showOptions, setShowOptions] = createSignal(true);
  const [signallingServer, setSignallingServer] = createSignal({server: defaultServer});
  const onSignallingServerChanged = (ev) => {
    let type = ev.target.value;
    setSignallingServer({server: getSignallingServer(type)});
  }
  const setValidationNotes = (field, notes) => {
    setNotes(field, notes);
    return !notes;
  }
  function onSubmit(ev){
    ev.preventDefault();
    if(isLoading()){
      return;
    }
    const [config, ok, searchParams] = formToConfig(ev.target, setValidationNotes);
    console.log(config, ok, unwrap(notes))
    if(ok){
      setSearchParams({
        ...searchParams
      })
      setConfig(config);
    }
  }
  return <form onSubmit={onSubmit}>
    <Dynamic component={signallingServer().server.ParticipantConnectionInput} validationNotes={notes.ParticipantConnectionInput}/>
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
    <details open={showOptions() ? "yes" : undefined}>
      <summary style="display:none;"/>
      <hr/>
      <h3>Signalling server configuration</h3>
      <div class="entry-group more">
        <label class="label" htmlFor="signallingServerGroup">How to find your host?</label>
        <RadioGroup name="signallingServer" initialValue={searchParams.signallingServer || "TEST"} options={getSignallingServerOptions()} onInput={onSignallingServerChanged}/>
        <div/>
        <div/>
        <b class="note">
          {notes.more}
        </b>
      </div>
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
