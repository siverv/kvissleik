import { Subject, first } from 'rxjs';


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