import { createSignal } from "solid-js";
import { Playing } from '../components/play/Playing';
import { JoinedRoomCreator } from '../components/play/JoinedRoomCreator';
import "../style/views.css";

export function Play(){
  let [room, setRoom] = createSignal(null);
  return <div class="view play-view">
    <Show when={room()}
      fallback={<JoinedRoomCreator setRoom={setRoom}/>}>
      {(room) => <Playing room={room} quit={() => setRoom(null)}/>}
    </Show>
  </div>;
}