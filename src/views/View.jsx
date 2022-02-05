import { getQuizCollection } from "../service/storageService";
import { DisplayQuiz } from '../components/ui/DisplayQuiz';
import { For, createSignal, createMemo } from "solid-js";
import { Link, useParams } from "solid-app-router";
import "../style/views.css";
import "./View.css";


export function View(){
  const params = useParams();
  const collection = getQuizCollection();
  let quiz = collection.get(params.id);
  return <section class="view view-view">
    <Show when={quiz} fallback={<i>no quiz found by id {params.id}</i>}>
      <section class="section">
        <div class="section-header">
          <h3>
            {quiz.name}
          </h3>
          <Link class="button-link" href={`/host/?quizId=${quiz.id}`}>
            host
          </Link>
          <Link class="button-link" href={`/edit/${quiz.id}`}>
            edit
          </Link>
        </div>
        <For each={quiz.questions}>
          {(question, index) => {
            let [show, setShow] = createSignal(false);
            return <>
              {index() > 0 ? <hr/> : null}
              <DisplayQuiz question={question} correct={createMemo(() => show() ? question.correct : undefined)}/>
              <button type="button" onClick={() => setShow(!show())}>
                {show() ? "hide" : "show"} answer
              </button>
            </>;
          }}
        </For>
      </section>
    </Show>
  </section>;
}