import { createSignal } from 'solid-js';
import "../style/views.css";
import {Hosting} from '../components/host/Hosting';
import {HostedRoomCreator} from '../components/host/HostedRoomCreator';

export function Host(){
  let [room, setRoom] = createSignal(null);
  const quit = async () => {
    let currentRoom = room();
    setRoom(null);
    await currentRoom.destroy();
  }
  return <div class="view host-view">
    <Show when={room()}
      fallback={<HostedRoomCreator setRoom={setRoom}/>}>
      {(room) => <Hosting room={room} quit={quit}/>}
    </Show>
  </div>
}