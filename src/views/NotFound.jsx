import {DisplayQuiz} from '../components/ui/DisplayQuiz';
import "../style/views.css";

export function NotFound(){
  return <div class="view not-found-view">
    <DisplayQuiz
      question={{
        id: "PageNotFound",
        text: "Which error-code is <b>'Page Not Found'</b>?",
        correct: "404",
        alternatives: [
          {id: "303", text: "303"},
          {id: "201", text: "201"},
          {id: "500", text: "500"},
          {id: "404", text: "404"},
        ]
      }}
      correct={"404"}
    />
  </div>;
}
