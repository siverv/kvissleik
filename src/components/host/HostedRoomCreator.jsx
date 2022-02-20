import {createSignal, createResource, onCleanup} from 'solid-js';
import {createStore} from 'solid-js/store';
import { createDummyQuiz } from "../../service/makeService";
import { getQuizCollection } from "../../service/storageService";
import { SamspillHost } from '../../service/samspill/samspill';
import {useSearchParams} from 'solid-app-router';
import {RadioGroup} from '../../service/samspill/components/RadioGroup';
import DefaultSignallingServer, {getSignallingServer, getSignallingServerOptions} from '../../service/samspill/signalling';
import "./HostForm.css";

export function HostedRoomCreator({setRoom}){
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
  const [signallingServer, setSignallingServer] = createSignal({server: DefaultSignallingServer});
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