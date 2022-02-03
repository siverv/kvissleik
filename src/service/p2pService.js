


import { createContext } from 'solid-js';
import {HostedRoom, JoinedRoom} from '../utils/samspillUtils';

export function createRoom(Room, config){
  let room = new Room({
    protocol: import.meta.env.VITE_SAMSPILL_PROTOCOL,
    host: import.meta.env.VITE_SAMSPILL_HOST,
    ...config
  });
  room.connectToLobby();
  return room;
}


export function createHostedRoom(config){
  return createRoom(HostedRoom, config);
}

export function createJoinedRoom(config){
  return createRoom(JoinedRoom, config);
}


export const RoomContext = createContext(() => null);