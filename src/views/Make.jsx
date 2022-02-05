import { createSignal, For, Switch, createMemo } from "solid-js";
import { createQuizCollection } from "../service/storageService";
import { duplicateQuiz, createQuiz } from "../service/makeService";
import { QuizEditor } from '../components/quiz/QuizEditor';
import { DisplayQuiz } from '../components/ui/DisplayQuiz';
import "./View.css";
import "./Make.css";


export function MakeView(){
  let collection = createQuizCollection();
  let [editingQuiz, setEditingQuiz] = createSignal(null);
  let [viewingQuiz, setViewingQuiz] = createSignal(null);
  let [importError, setImportError] = createSignal(null);
  return <section class="view make-view">
    <Switch>
      <Match when={editingQuiz() == null && viewingQuiz() == null}>
        <section class="section">
          <button type="button" class="create-new-quiz" onClick={() => setEditingQuiz(createQuiz())}>create a new quiz</button>
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
                let [copied, setCopied] = createSignal(false);
                return <li>
                  <b class="quiz-name">
                    {quiz.name}
                  </b>
                  <span class="quiz-info">
                    {quiz.questions.length} questions
                    {` `}
                    <span>
                      ({createMemo(() => Math.round(JSON.stringify(quiz).length / 1000))}kB)
                    </span>
                  </span>
                  <button type="button" onClick={() => setViewingQuiz(quiz)}>view</button>
                  <button type="button" onClick={() => setEditingQuiz(quiz)}>edit</button>
                  <button type="button" class="quiz-duplicate" onClick={() => {
                    collection.store(duplicateQuiz(quiz));
                  }}>duplicate</button>
                  <button type="button" class="quiz-delete" onClick={() => collection.remove(quiz.id)}>
                    delete
                  </button>
                  <button type="button" class="quiz-export" onClick={async () => {
                    await navigator.clipboard.writeText(JSON.stringify(duplicateQuiz(quiz)));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 5 * 1000);
                  }}>{copied() ? "copied to clipboard!" : "export as json"}</button>
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
      </Match>
      <Match when={editingQuiz() != null}>
        <QuizEditor quiz={editingQuiz()} saveQuiz={(quiz) => collection.store(quiz)} goBack={() => setEditingQuiz(null)}/>
      </Match>
      <Match when={viewingQuiz() != null}>
        <section class="section">
          <button onClick={() => setViewingQuiz(null)}>back</button>
          <h3 class="section-header">
            {viewingQuiz().name}
          </h3>
          <For each={viewingQuiz().questions}>
            {(question) => <><DisplayQuiz question={question}/><hr/></>}
          </For>
        </section>
      </Match>
    </Switch>
  </section>;
}