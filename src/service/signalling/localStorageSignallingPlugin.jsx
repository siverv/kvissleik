import {createSignal, observable, onCleanup} from 'solid-js';
import { CopyToClipboardButton } from '../../components/ui/CopyToClipboardButton';
import { RoomCodeEntry } from '../../components/ui/RoomCodeEntry';
import { RadioGroup } from '../../components/ui/RadioGroup';
import {SignallingServer} from './signallingPluginTemplate';
import {useSearchParams} from 'solid-app-router';
import {generateAlphabeticalId} from '../../utils/cryptoUtils';



// Useful for testing purposes locally without a websocket-server.
// Can also be a standin for "public append logs" wrt. needs.
export class LocalStorageAppendLog extends SignallingServer {
  static SIGNALLING_SERVER_ID = "TEST";
  static details = {
    name: "Local Test",
    description: "LocalStorage-based signalling server for testing purposes. Acts like polling a public append log.",
  };

  offset = 0;
  pollingInterval = setInterval(this.poll.bind(this), 1000);
  sleeping = false;
  getLog(){
    return JSON.parse(localStorage.getItem(this.roomCode) || "[]");
  }
  poll(){
    let log = this.getLog();
    let list = log.slice(this.offset);
    if(list.length){
      this.offset += list.length;
      for(let i = 0; i < list.length; i++){
        if(list[i].data === "SLEEP"){
          this.sleeping = true;
          continue;
        } else if(list[i].data === "WAKE"){
          this.sleeping = false;
          continue;
        }
        if(!this.sleeping){
          if(list[i].target == null || list[i].target === this.whoami){
            this.emitEvent({
              type: "MESSAGE",
              source: list[i].source,
              data: list[i].data
            });
          }
        }
      }
    }
  }

  cleanup(){
  }

  getRoomCode(){
    return null;
  }

  getRoomLink(){
    let roomCode = this.roomCode;
    let hasPassword = !!this.password;
    let long = roomCode.length > 4;
    return `${window.location.origin}/play?signallingServer=${this.constructor.SIGNALLING_SERVER_ID}&moreLetters=${long}&roomCode=${roomCode}`
  }

  createChannel(config){
    let connectionConfig = config.connectionConfig;
    this.whoami = config.whoami;
    this.emitEvent({type: "STATE", data: "CONNECTING"});
    if(connectionConfig.roomCodeType === "ROOM_CODE"){
      this.roomCode = generateAlphabeticalId(connectionConfig.roomCodeLength).toUpperCase();
    } else {
      this.roomCode = generateAlphabeticalId(50, "ABCDEFGHIJKLMOPQRSTUVWXYZ0123456789").toUpperCase();
    } 
    this.hidden = connectionConfig.roomCodeType === "HIDDEN";
    this.secure = connectionConfig.roomCodeType === "SECURE";
    this.password = connectionConfig.password;
    localStorage.setItem(this.roomCode, "[]");
    this.send(null, {type: "HOSTING"})
    this.emitEvent({type: "STATE", data: "CONNECTED"});
    return {
      destroy: () => {
        this.emitEvent({type: "STATE", data: "DISCONNECTED"});
        localStorage.removeItem(this.roomCode);
        this.cleanup();
      },
      sleep: () => {
        this.send(null, {type: "SLEEP"});
      },
      wake: () => {
        this.send(null, {type: "WAKE"});
      }
    }
  }

  openChannel(config){
    let connectionConfig = config.connectionConfig;
    this.whoami = config.whoami;
    this.roomCode = connectionConfig.code;
    this.emitEvent({type: "STATE", data: "CONNECTING"});
    this.emitEvent({type: "STATE", data: "CONNECTED"});
    return {
      close: () => {
        this.emitEvent({type: "STATE", data: "DISCONNECTED"});
        this.cleanup();
      }
    }
  }

  send(target, data){
    localStorage.setItem(this.roomCode, JSON.stringify([
      ...this.getLog(),
      {target, source: this.whoami, data}
    ]));
  }
}


LocalStorageAppendLog.ParticipantConnectionInput = function({validationNotes}) {
  let [searchParams] = useSearchParams()
  return <RoomCodeEntry notes={validationNotes.roomCode} initialMoreLetters={searchParams.moreLetters === "true"} initialValue={searchParams.roomCode}/>;
}
LocalStorageAppendLog.ParticipantConnectionInput.parseFormData = function(formData) {
  const connectionDetails = {};
  let validationNotes = null;
  let searchParams = {};
  connectionDetails.code = RoomCodeEntry.parseFormData(formData);
  if(connectionDetails.code.length < 4){
    validationNotes = {...validationNotes, code: "Code is too short: needs to be at least 4 characters"};
  } else if(connectionDetails.code.match(/^[A-Z0-9]$/)){
    validationNotes = {...validationNotes, code: "Code contains invalid characters"};
  } else {
    searchParams.code = connectionDetails.code;
  }
  return [
    connectionDetails,
    validationNotes,
    searchParams
  ]
}

LocalStorageAppendLog.HostConnectionDetails = function({server}) {
  return <>
    <Show when={server.getRoomCode()}>
      {code => <h3>
          Room code is {code}
        <CopyToClipboardButton getValue={() => code}>
          copy
        </CopyToClipboardButton>
      </h3>
      }
    </Show>
    <Show when={server.getRoomLink()}>
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
  </>
}

LocalStorageAppendLog.HostConfigurationInput = function({validationNotes}) {
  const [isRoomCode, setIsRoomCode] = createSignal(true);
  return <>
    <div class="entry-group password">
      <label class="label" htmlFor="signallingConfig_password">Password?</label>
      <input id="signallingConfig_password" name="signallingConfig_password" type="password"/>
      <div/>
      <b class="note">
        {validationNotes?.password}
      </b>
    </div>
    <div class="entry-group modes">
      <label class="label" htmlFor="signallingServerGroup">How would you like your room?</label>
      <RadioGroup name="signallingConfig_roomCodeType" initialValue="ROOM_CODE" options={[
          {value: "ROOM_CODE", label: "Room Code", description: "A random room code is needed to join the room."},
          {value: "HIDDEN", label: "Hidden Room", description: "An unguessably long random room code is needed to join the room. Best shared by a link."},
          {value: "SECURE", label: "Secure Room", description: "An unguessably long random room code is needed to join the room. Best shared by a link. All signalling is encrypted."},
      ]} onInput={ev => setIsRoomCode(ev.target.value === "ROOM_CODE")}/>
      <div/>
      <div/>
      <b class="note">
        {validationNotes?.roomCodeType}
      </b>
    </div>
    <Show when={isRoomCode()}>
      <div class="entry-group code-length">
        <label class="label" htmlFor="roomCodeLength">Room Code Length</label>
        <input id="roomCodeLength" name="roomCodeLength" type="number" step="1" min="4" max="128" value="4"/>
        <div/>
        <b class="note">
          {validationNotes?.roomCodeLength}
        </b>
      </div>
    </Show>
  </>
}
LocalStorageAppendLog.HostConfigurationInput.parseFormData = function(formData) {
  let validationNotes = null;
  let connectionConfig = {};
  let searchParams = {};
  connectionConfig.roomCodeType = formData.get("signallingConfig_roomCode");
  searchParams.roomCodeType = connectionConfig.roomCodeType;

  if(connectionConfig.roomCodeType === "ROOM_CODE"){
    connectionConfig.roomCodeLength = parseInt(formData.get("roomCodeLength"));
    if(isNaN(connectionConfig.roomCodeLength)){
      validationNotes = {...validationNotes, roomCodeLength: <>The room code length needs to be a number.</>};
    } else if(connectionConfig.roomCodeLength < 4 || connectionConfig.roomCodeLength > 128) {
      validationNotes = {...validationNotes, roomCodeLength: <>The room code length needs to be greater than 4.</>};
    } else {
      searchParams.roomCodeLength = connectionConfig.roomCodeLength;
    }
  }
  connectionConfig.password = formData.get("signallingConfig_password") || null;
  
  return [
    connectionConfig,
    validationNotes,
    searchParams
  ]
}