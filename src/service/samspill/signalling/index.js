
// import {LocalStorageSignallingServer} from './localStorageSignallingPlugin';
// import {CopyPasteSignalling} from './copypasteSignallingPlugin';
import {WebSocketSignallingServer} from './webSocketSignallingPlugin';

export const signallingServers = [
  WebSocketSignallingServer,
  // LocalStorageSignallingServer,
  // CopyPasteSignalling,
];

export function getSignallingServer(type){
  for(let signallingPlugin of signallingServers){
    if(type === signallingPlugin.SIGNALLING_SERVER_ID){
      return signallingPlugin;
    }
  }
}

export function getSignallingServerOptions(){
  return signallingServers.map(server => ({
    value: server.SIGNALLING_SERVER_ID,
    label: server.details.name,
    description: server.details.description
  }));
}

export default WebSocketSignallingServer;