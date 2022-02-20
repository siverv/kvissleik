import { createSignal } from 'solid-js';
import { RadioGroup } from './RadioGroup';

export function HostConfigurationInput({validationNotes}) {
  const [isRoomCode, setIsRoomCode] = createSignal(true);
  return <>
    <div class="entry-group password">
      <label class="label" htmlFor="signallingConfig_password">Protect the room with a secret password</label>
      <input id="signallingConfig_password" name="signallingConfig_password" type="password"/>
      <div/>
      <b class="note">
        {validationNotes?.password}
      </b>
    </div>
    <div class="entry-group modes">
      <label class="label" htmlFor="signallingServerGroup">How would you like your room?</label>
      <RadioGroup name="signallingConfig_roomCodeType" initialValue="ROOM_CODE" options={[
          {value: "ROOM_CODE", label: "Room Code", description: "A 4-letter room code is all that's required to join."},
          {value: "HIDDEN", label: "Hidden Room", description: "An unguessable room code, which can be shared by link."},
          // {value: "SECURE", label: "Secure Room", description: "Encrypted metadata, not just encrypted pload. Requires link."},
      ]} onInput={ev => setIsRoomCode(ev.target.value === "ROOM_CODE")}/>
      <div/>
      <div/>
      <b class="note">
        {validationNotes?.roomCodeType}
      </b>
    </div>
  </>
}
HostConfigurationInput.parseFormData = function(formData) {
  let validationNotes = null;
  let config = {};
  let searchParams = {};
  config.roomCodeType = formData.get("signallingConfig_roomCode");
  searchParams.roomCodeType = config.roomCodeType;

  if(config.roomCodeType === "ROOM_CODE"){
    config.roomCodeLength = parseInt(formData.get("roomCodeLength"));
    if(isNaN(config.roomCodeLength)){
      validationNotes = {...validationNotes, roomCodeLength: <>The room code length needs to be a number.</>};
    } else if(config.roomCodeLength < 4 || config.roomCodeLength > 128) {
      validationNotes = {...validationNotes, roomCodeLength: <>The room code length needs to be greater than 4.</>};
    } else {
      searchParams.roomCodeLength = config.roomCodeLength;
    }
  }
  config.password = formData.get("signallingConfig_password") || null;
  
  return [
    config,
    validationNotes,
    searchParams
  ]
}