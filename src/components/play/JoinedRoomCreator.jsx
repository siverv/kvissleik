import { createSignal, createResource, createMemo } from "solid-js";
import { createStore } from "solid-js/store";
import { SamspillParticipant } from '../../service/samspill/samspill';
import { useSearchParams } from 'solid-app-router';
import { RadioGroup } from '../../service/samspill/components/RadioGroup';
import DefaultSignallingServer, { getSignallingServer, getSignallingServerOptions } from '../../service/samspill/signalling';
import './PlayForm.css';

const SAMSPILL_PREVIOUS_NAME = "SAMSPILL_PREVIOUS_NAME";


export function JoinedRoomCreator({setRoom}){
  const [config, setConfig] = createSignal();
  const [denied, setDenied] = createSignal();
  const [room] = createResource(config, async (config, {value: room}) => {
    let denied = await room.initialize(config);
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
        </details>;
      }}
    </Show>
  </section>;
}

function validateName(name){
  if(!name){
    return "You need a name";
  } else if(!name.match(/^.{1,20}$/)){
    return "Name needs to be between 1 and 20 characters";
  }
}

function formToConfig(form, setValidationNotes){
  let ok = true;
  const config = {};
  const formData = new FormData(form);
  let searchParams = {};
  
  config.name = formData.get("name");
  ok &&= setValidationNotes("name", validateName(config.name));

  searchParams.signallingServer = config.signallingServer = formData.get("signallingServer");
  let server = getSignallingServer(config.signallingServer);
  let [connectionConfig, connectionConfigValidation, connectionSearchParams] = server.ParticipantConnectionInput.parseFormData(formData);
  Object.assign(config, connectionConfig);
  ok &&= setValidationNotes("ParticipantConnectionInput", connectionConfigValidation);
  Object.assign(searchParams, connectionSearchParams);

  searchParams.stunServer = config.stunServer = formData.get("stunServer");

  return [config, ok, searchParams];
}


export function JoinConfigForm({isLoading, setConfig, denied}){
  let initialName = localStorage.getItem(SAMSPILL_PREVIOUS_NAME);
  const [searchParams, setSearchParams] = useSearchParams();
  const [notes, setNotes] = createStore({});
  const [showOptions, setShowOptions] = createSignal(false);
  const [signallingServer, setSignallingServer] = createSignal({server: DefaultSignallingServer});
  const onSignallingServerChanged = (ev) => {
    let type = ev.target.value;
    setSignallingServer({server: getSignallingServer(type)});
  };
  const setValidationNotes = (field, notes) => {
    setNotes(field, notes);
    return !notes;
  };
  function onSubmit(ev){
    ev.preventDefault();
    if(isLoading()){
      return;
    }
    const [config, ok, searchParams] = formToConfig(ev.target, setValidationNotes);
    if(ok){
      localStorage.setItem(SAMSPILL_PREVIOUS_NAME, config.name);
      setSearchParams({
        ...searchParams
      });
      setConfig(config);
    }
  }
  return <form onSubmit={onSubmit}>
    <Dynamic component={signallingServer().server.ParticipantConnectionInput} validationNotes={notes.ParticipantConnectionInput}/>
    <div class="entry-group name">
      <label class="label" htmlFor="name-entry-input">Hello, my name is</label>
      <input id="name-entry-input" name="name" type="text" minLength={1} maxLength={20} placeholder="Jack and/or Jill" value={searchParams.name || initialName}></input>
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
      <Show when={denied()}>
        <div/>
        <b class="note">
          {denied().reason}
        </b>
      </Show>
    </div>
    <details open={showOptions() ? "yes" : undefined}>
      <summary style="display:none;"/>
      <hr/>
      <h3>Signalling server configuration</h3>
      <div class="entry-group more">
        <label class="label" htmlFor="signallingServerGroup">How to find your host?</label>
        <RadioGroup name="signallingServer" initialValue={searchParams.signallingServer || DefaultSignallingServer.SIGNALLING_SERVER_ID} options={getSignallingServerOptions()} onInput={onSignallingServerChanged}/>
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
          {/*<option value="NONE">
            No STUN
          </option>*/}
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
