import { Subject, first } from 'rxjs';
import {createSignal, observable, onCleanup} from 'solid-js';
import { CopyToClipboardButton } from '../../components/ui/CopyToClipboardButton';
import { RoomCodeEntry } from '../../components/ui/RoomCodeEntry';
import { RadioGroup } from '../../components/ui/RadioGroup';
import {useSearchParams} from 'solid-app-router';
import {generateAlphabeticalId} from '../../utils/cryptoUtils';

/**
 * Events from SignallingServer to SamspillClient
 * both:
 * - STATE: CONNECTED | CONNECTING | DISCONNECTED
 * - ROOM_STATE: ACTIVE | SLEEPING | DEAD
 * - SIGNAL: <signal>
 * 
 * host:
 * - PARTICIPANTS: [{id, name}]
 * 
 * participants:
 * - ACCEPTED: room-type
 * - DENIED: reason
 * - KICKED
 */

/**
 * Messages to/from server and clients
 * 
 * any-to-server/target:
 * - SIGNAL: signal
 * - QUEUE: some-bounced-message
 * 
 * server-to-any:
 * - BOUNCE: some-bounced-message
 * 
 * host-to-server/participants:
 * - HOST: publicKey, settings
 * - SLEEP
 * - WAKE
 * - QUIT
 * 
 * host-to-server/participant:
 * - KICK: externalId
 * 
 * server-to-host:
 * - ROOM: code, participants
 * 
 * participant-to-server/host:
 * - JOIN: code, version
 * - HANDSHAKE: externalId, name, ?password
 * - QUIT
 * 
 * server/host-to-participant:
 * - HANDSHAKE: publicKey, hasPassword
 * - DENIED: reason
 */


 /**
  * Different server combines the messages differently:
  * - WS-server has a distinct server as a target and relay, and this handles as much as it can of handshaking and similar.
  * - Public append logs has a HOST_HANDSHAKE, with a JOIN_HANDSHAKE_SIGNAL response, with SIGNAL for acceptance or DENIED for denial.
  * - Copy paste has no concept of SLEEP/WAKE/QUIT/KICK/DENIED as those are handled manually, and otherwise is similar to public append log. The HOST_HANDSHAKE is given through the link.
  * 
  * */

// Technically used mostly as an interface here.
export class SignallingServer {
  static SIGNALLING_SERVER_ID = "TEMPLATE";

  static details = {
    name: "Template",
    description: "Description of what this signalling server is"
  }
  events = new Subject();
  emitEvent(data){
    this.events.next(data);
  }
  addEventListener(listener){
    return this.events.subscribe(listener);
  }


  /*

  async cleanup(){
  }

  async createChannel(){
    return {
      destroy: () => {},
      sleep: () => {},
      wake: () => {},
    }
  }

  async openChannel(){
    return {
      close: () => {},
    }
  }

  async send(target, data){

  }

  */

}

/**
 * Display the necessary input elements to make this participant able to join the desired host
 * @param {?Object} validationNotes: validation notes as returned by parseFormData
 */
SignallingServer.ParticipantConnectionInput = function({validationNotes}) {
  return <>
    Add necessary form inputs needed for connecting to host
  </>
}
/**
 * Parse the form data in order to create the connecitonDetails necessary to connect.
 * @param {FormData} formData from the encompassing form. May contain more than just the input elements of this plugin.
 * @returns {[Object, ?Object]}
 */
SignallingServer.ParticipantConnectionInput.parseFormData = function(formData) {
  const validationNotes = null;
  const connectionDetails = {};
  // Convert the FormData into connectingDetails that can be used by the SignallingServer
  // Validation-notes as anything other than a falsy value will prevent connection and update validationNotes in the input. 
  return [
    connectionDetails,
    validationNotes
  ]
}

/**
 * Display the necessary details to make participants able to join this host.
 * @param {SignallingServer} server: a fully connected signalling server
 */
SignallingServer.HostConnectionDetails = function({server}) {
  return <>
    Add necessary details to make participants join. 
  </>
}

/**
 * Display the necessary input elements to configure the signalling server before connection
 * @param {?Object} validationNotes: validation notes as returned by parseFormData
 */
SignallingServer.HostConfigurationInput = function({validationNotes}) {

}
/**
 * Parse the form data in order to create the connectionConfig necessary to connect.
 * @param {FormData} formData from the encompassing form. May contain more than just the input elements of this plugin.
 * @returns {[Object, ?Object]}
 */
SignallingServer.HostConfigurationInput.parseFormData = function(formData) {
  const validationNotes = null;
  const connectionConfig = {};
  // Convert the FormData into connectingDetails that can be used by the SignallingServer
  // Validation-notes as anything other than a falsy value will prevent connection and update validationNotes in the input. 
  return [
    connectionConfig,
    validationNotes
  ]
}





export function applyDefaultRoomCodeConfig(Server) {
  Server.prototype.getRoomCode = function(){
    if(this.hidden || this.secure){
      return null;
    } else {
      return this.roomCode;
    }
  }

  Server.prototype.getRoomLink = function(){
    let roomCode = this.roomCode;
    let hasPassword = !!this.password;
    let long = roomCode.length > 4;
    return `${window.location.origin}/play?signallingServer=${this.constructor.SIGNALLING_SERVER_ID}&moreLetters=${long}&roomCode=${roomCode}`
  }

  Server.prototype.createChannelConfig = function(config){
    let connectionConfig = config.connectionConfig;
    if(connectionConfig.roomCodeType === "ROOM_CODE"){
      this.roomCode = generateAlphabeticalId(connectionConfig.roomCodeLength).toUpperCase();
    } else {
      this.roomCode = generateAlphabeticalId(50, "ABCDEFGHIJKLMOPQRSTUVWXYZ0123456789").toUpperCase();
    } 
    this.hidden = connectionConfig.roomCodeType === "HIDDEN";
    this.secure = connectionConfig.roomCodeType === "SECURE";
    this.password = connectionConfig.password;
  }

  Server.prototype.openChannelConfig = function(config){
    let connectionConfig = config.connectionConfig;
    this.roomCode = connectionConfig = connectionConfig.code;
    this.password = connectionConfig.password;
  }

  Server.ParticipantConnectionInput = function({validationNotes}) {
    let [searchParams] = useSearchParams()
    return <RoomCodeEntry notes={validationNotes.roomCode} initialValue={searchParams.roomCode}/>;
  }
  Server.ParticipantConnectionInput.parseFormData = function(formData) {
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

  Server.HostConnectionDetails = function({server}) {
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

  Server.HostConfigurationInput = function({validationNotes}) {
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
  Server.HostConfigurationInput.parseFormData = function(formData) {
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
}