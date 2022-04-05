import { createSignal, For, createMemo } from "solid-js";
import { getQuizCollection } from "../service/storageService";
import { duplicateQuiz } from "../service/makeService";
import { CopyToClipboardButton } from '../components/ui/CopyToClipboardButton' ;
import "../style/views.css";
import "./Make.css";
import { Link } from 'solid-app-router';


export function Make(){
  let collection = getQuizCollection();
  let [importError, setImportError] = createSignal(null);
  let [termsAccepted, setTermsAccepted] = createSignal(false);
  return <section class="view make-view">
    <section class="solid-hack-warning">
      <h4>About the SolidHack contest:</h4>
      <p>
        The quiz-editor is not part of the entry, and should not be included for consideration while voting; this is merely a useful tool to actually create quiz to properly use the quiz-app. Only the actual p2p quiz aspect (play / host) is part of the contest.
      </p>
      <p>
        The core of the quiz-editor was started on before the contest start, and despite being rewritten, some parts are still in use.
      </p>
      <label>
        <input type="checkbox" onInput={(ev) => setTermsAccepted(ev.target.checked)}/>
          Accept that the editor is not part of the contest?
      </label>
    </section>
    <section class="section">
      <Show when={termsAccepted()} fallback={<button type="button" class="button-link create-new-quiz" disabled="disabled">Create a new quiz</button>}>
        <Link class="button-link create-new-quiz" href={`/edit/new`}>
          Create a new quiz
        </Link>
      </Show>
    </section>
    <section class="section local-section">
      <h3 class="section-header">
        Locally stored quizzes
        {` `}
        <span>
          ({createMemo(() => Math.round(JSON.stringify(collection.list()).length / 1000))}kB)
        </span>
      </h3>
      <ul>
        <For each={collection.list()} fallback={<i>no quizzes stored.</i>}>
          {(quiz) => {
            return <li>
              <Link href={`/show/${quiz.id}`} class="quiz-name">
                {quiz.name}
              </Link>
              <span class="quiz-info">
                {quiz.questions.length} questions
                {` `}
                <span>
                  ({createMemo(() => Math.round(JSON.stringify(quiz).length / 1000))}kB)
                </span>
              </span>
              <Link class="button-link" href={`/host?quizId=${quiz.id}`}>
                host
              </Link>
              <Link class="button-link" href={`/edit/${quiz.id}`}>
                edit
              </Link>
              <button type="button" class="quiz-duplicate" onClick={() => {
                collection.store(duplicateQuiz(quiz));
              }}>duplicate</button>
              <button type="button" class="quiz-delete" onClick={() => collection.remove(quiz.id)}>
                delete
              </button>
              <CopyToClipboardButton class="quiz-export" getValue={() => JSON.stringify(duplicateQuiz(quiz, true))}>
                export as json
              </CopyToClipboardButton>
            </li>;
          }}
        </For>
      </ul>
    </section>
    <section class="section">
      <h3 class="section-header">
        Import from json
      </h3>
      <div class="entry-group name">
        <label class="label" htmlFor="import-as-json">
          Paste in quiz here:
        </label>
        <textarea id="import-as-json" placeholder="{...}"/>
        <button onClick={() => {
          try {
            let textarea = document.getElementById("import-as-json");
            let quizJson = JSON.parse(textarea.value);
            collection.store(duplicateQuiz(quizJson));
            textarea.innerText = "";
          } catch(ex){
            setImportError(ex.toString());
          }
        }}>import</button>
        <div/>
        <b class="note">
          {importError}
        </b>
      </div>
    </section>
  </section>;
}