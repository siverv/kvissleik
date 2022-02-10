import { QuizHostView } from "../components/quiz/QuizHostView";
import { HostForm } from "../components/form/HostForm";
import {batch, createSignal, createMemo, createResource} from 'solid-js';
import {createHostedRoom} from '../service/samspillService';
import "../style/views.css";

export function Host(){
  let [room, setConfig, refetch] = createHostedRoom();
  let [quiz, setQuiz] = createSignal(null);
  const startQuiz = async (quiz, config) => {
    setQuiz(quiz);
    setConfig(config);
  };
  return <div class="view host-view">
    <Show when={room.error}>
      Error: {room.error}
    </Show>
    <Switch>
      <Match when={room() == null}>
        <Show when={() => room.error}>
          {room.error}
        </Show>
        <HostForm startQuiz={startQuiz}/>
      </Match>
      <Match when={room.loading}>
        Creating room...
      </Match>
      <Match when={room()}>
        <QuizHostView room={room()} quiz={quiz()}/>
      </Match>
    </Switch>
  </div>;
}
