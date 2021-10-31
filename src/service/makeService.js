import { jsonifyQuiz, signalifyQuiz, signalifyQuizTask } from "../utils/quizUtils";

const SAVE_KEY = "CURRENTLY_ONLY_ONE_QUIZ_AT_A_TIME___TO_BE_STORED_IN_SOLID_PROJECT";

const defaultQuiz = {
  name: "Quiz name",
  content: []
};

const defaultQuizTask = {
  question: "Question?",
  image: null,
  alternativeA: "a",
  alternativeB: "b",
  alternativeC: "c",
  alternativeD: "d",
};

export function createQuizTask(){
  return signalifyQuizTask(defaultQuizTask);
}

export function createQuiz(){
  return signalifyQuiz(defaultQuiz);
}

export function addQuizTask([getQuiz, setQuiz]){
  let quiz = getQuiz();
  let content = quiz.content.concat([
    createQuizTask()
  ]);
  setQuiz({
    ...quiz,
    content
  });
  return content.length - 1;
}

export function saveQuiz([getQuiz]) {
  let jsonQuiz = jsonifyQuiz([getQuiz]);
  localStorage.setItem(SAVE_KEY, JSON.stringify(jsonQuiz));
}
export function loadQuiz([,setQuiz]) {
  let quiz = localStorage.getItem(SAVE_KEY);
  if(quiz){
    try {
      let jsonQuiz = JSON.parse(quiz);
      let [newQuiz] = signalifyQuiz(jsonQuiz);
      setQuiz(newQuiz());
    } catch(err){
      console.error("Could not load quiz", {quiz});
    }
  }
}
