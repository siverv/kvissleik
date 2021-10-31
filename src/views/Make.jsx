import { batch, createSignal, For } from "solid-js";
import { Keyed } from "../components/meta/Keyed";
import { QuizEditView } from "../components/quiz/QuizEditView";
import { QuizThumbnail } from "../components/quiz/QuizThumbnail";
import { PlaintextInput } from "../components/ui/TextInput";
import { addQuizTask, createQuiz, loadQuiz, saveQuiz } from "../service/makeService";


export function MakeView(){
  const [currentPage, setCurrentPage] = createSignal(null);
  const [quiz, setQuiz] = createQuiz();
  const newPage = () => {
    batch(() => {
      let index = addQuizTask([quiz, setQuiz]);
      setCurrentPage(index);
    });
  };
  const save = () => saveQuiz([quiz]);
  const load = () => batch(() => {
    loadQuiz([quiz,setQuiz]);
    setCurrentPage(0);
  });
  return <section class="quiz-editor">
    <header class="editor-toolbar">
      <h3>
        <PlaintextInput signal={quiz().name}/>
      </h3>
      <button onClick={save}>save</button>
      <button onClick={load}>load</button>
    </header>
    <aside class="pages">
      <button class="new-page" onClick={() => newPage(null)}>
        <div class="page-thumbnail">
          New Quiz Task
        </div>
      </button>
      <For each={quiz().content}>
        {([quizTask], index) => {
          return <button class="select-page" onClick={() => setCurrentPage(index)}>
            <div class="page-thumbnail">
              <span style="float: left">
                {index() + 1}.
              </span>
              <QuizThumbnail quizTask={quizTask}/>
            </div>
          </button>;
        }}
      </For>
    </aside>
    <section class="page-editor">
      <Show when={currentPage() != null}>
        <Keyed key={() => quiz().content[currentPage()]}>
          {(signal) => <QuizEditView quizTaskSignal={signal}/>}
        </Keyed>
      </Show>
      <Show when={currentPage() == null}>
        <button class="new-page" onClick={newPage}>
          <div class="page-thumbnail">
            New Quiz Task
          </div>
        </button>
      </Show>
      <section>
        <button>
          asd
        </button>
        <button>
          asd
        </button>
        <button>
          asd
        </button>
        <button>
          asd
        </button>
      </section>
    </section>
    <aside class="quiz-properties">
      settings and adjustments
    </aside>
  </section>;
}
