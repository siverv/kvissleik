/* eslint-disable */

import {createSignal, observable, onCleanup} from 'solid-js';
import { CopyToClipboardButton } from '../components/CopyToClipboardButton';
import {SignallingServer} from './signallingPluginTemplate';
import {useSearchParams} from 'solid-app-router';


// This one has a great need for direct access to UI, while others can survive on config.
// I'm considering "packaging" these modules with ui, but would probably need to reduce async or improve root-chaining
export class CopyPasteSignalling extends SignallingServer {
  static SIGNALLING_SERVER_ID = "COPYPASTE";
  static details = {
    name: "Clipboard",
    description: "Manually exchange the signals using copy and paste.",
  };

  cleanup(){}
  createChannel(){
    // Display link for copying.
    // Display textarea for pasting.
    return {
      destroy: () => {}, // remove textarea.
      sleep: () => {}, // hide textarea
      wake: () => {}, // show textarea
    };
  }
  openChannel(){
    // Display textarea for pasting.
    return {
      close: () => {} // remove textarea
    };
  }
  send(target, data){
    // Display HTML about what to copy and who to paste it to.
  }
}


CopyPasteSignalling.ParticipantConnectionInput = function() {
  return <div>
    name:
    <input/>
    from host:
    <textarea>
    </textarea>
    to host:
    <CopyToClipboardButton/>
    from host again:
    <textarea>
    </textarea>
  </div>;
};
CopyPasteSignalling.ParticipantConnectionInput.parseFormData = function(formData) {
  const validationMap = null;
  const connectionDetails = {};
  return [
    connectionDetails,
    validationMap
  ];
};

CopyPasteSignalling.HostConnectionDetails = function({server}) {
  return <>
    <div>
      <pre>
        Something to copy for all
        <CopyToClipboardButton/>
      </pre>
      <div>
        Or give them this link: <a>https://...?asddadsasda</a>
      </div>
      <ul>
        <li>
          From participant
          <textarea>
          </textarea>
          <CopyToClipboardButton/>
          to participant
          <pre>
          </pre>
        </li>
        <li>
          From participant
          <textarea>
          </textarea>
          <CopyToClipboardButton/>
          to participant
          <pre>
          </pre>
        </li>
        <li>
          From participant
          <textarea>
          </textarea>
          <CopyToClipboardButton/>
          to participant
          <pre>
          </pre>
        </li>
      </ul>
    </div>
  </>;
};