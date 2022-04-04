/* eslint-disable no-unused-vars */

import { EventStream } from '../events';

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
  };
  events = new EventStream();
  emitEvent(data){
    this.events.emit(data);
  }
  addEventListener(listener){
    return this.events.addListener(listener);
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
  </>;
};
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
  ];
};

/**
 * Display the necessary details to make participants able to join this host.
 * @param {SignallingServer} server: a fully connected signalling server
 */
SignallingServer.HostConnectionDetails = function({server}) {
  return <>
    Add necessary details to make participants join. 
  </>;
};

/**
 * Display the necessary input elements to configure the signalling server before connection
 * @param {?Object} validationNotes: validation notes as returned by parseFormData
 */
SignallingServer.HostConfigurationInput = function({validationNotes}) {

};
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
  ];
};