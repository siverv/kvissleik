import { getQuizCollection } from "../service/storageService";
import { createQuiz } from "../service/makeService";
import { QuizEditor } from '../components/edit/QuizEditor';
import { useParams } from "solid-app-router";
import { createMemo } from "solid-js";
import "../style/views.css";


export function Edit(){
  const params = useParams();
  const collection = getQuizCollection();
  const getQuiz = createMemo(() => {
    if(params.id === "new"){
      return createQuiz();
    } else {
      return collection.get(params.id);
    }
  })
  return <section class="view edit-view">
    <Show when={getQuiz()} fallback={<i>no quiz found by id {params.id}</i>}>
      <QuizEditor quiz={getQuiz()} saveQuiz={(quiz) => collection.store(quiz)}/>
    </Show>
  </section>;
}