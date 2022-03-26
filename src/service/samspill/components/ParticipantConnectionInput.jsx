import { RoomCodeEntry } from '../components/RoomCodeEntry';
import { useSearchParams } from 'solid-app-router';
import { createSignal, Show } from 'solid-js';

export function ParticipantConnectionInput({validationNotes}) {
  let [searchParams] = useSearchParams()
  let [showPassword, setShowPassword] = createSignal(searchParams.hasPassword === "true");
  return <>
    <input type="hidden" name="password_hasPassword" value={showPassword() ? "true" : "false"}/>
    <RoomCodeEntry notes={validationNotes?.roomCode} initialValue={searchParams.roomCode}/>
    <div style="margin:-1em;"/>
    <div class="entry-group password">
      <Show when={showPassword()} fallback={<><div/><div/></>}>
        <label class="label" htmlFor="password-entry-input">The secret word is</label>
        <input id="password-entry-input" name="password" type="password"></input>
      </Show>
      <div>
        <button type="button" onClick={() => setShowPassword(!showPassword())}>
          {showPassword() ? "No password?" : "Use password?"}
        </button>
      </div>
    </div>
    <div style="margin:1em;"/>
  </>;
}

ParticipantConnectionInput.parseFormData = function(formData) {
  const config = {};
  let validationNotes = null;
  let searchParams = {};
  config.roomCode = RoomCodeEntry.parseFormData(formData);
  if(config.roomCode.length < 4){
    validationNotes = {...validationNotes, roomCode: "Code is too short: needs to be at least 4 characters"};
  } else if(config.roomCode.match(/^[A-Z0-9]$/)){
    validationNotes = {...validationNotes, roomCode: "Code contains invalid characters"};
  } else {
    searchParams.roomCode = config.roomCode;
  }
  let hasPassword = formData.get("password_hasPassword") === "true";
  if(hasPassword){
    config.password = formData.get("password") || null;
  }
  config.name = formData.get("name")
  if(!config.name){
    validationNotes = {...validationNotes, name: "You need a name"}
  } else if(!config.name.match(/^.{1,20}$/)){
    validationNotes = {...validationNotes, name: "Name needs to be between 1 and 20 characters"};
  } else {
    localStorage.setItem("SAMSPILL_PREVIOUS_NAME", config.name);
  }
  return [
    config,
    validationNotes,
    searchParams
  ]
}
