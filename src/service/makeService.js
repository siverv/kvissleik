import { jsonifyQuiz, signalifyQuiz, signalifyQuizTask } from "../utils/quizUtils";

const SAVE_KEY = "CURRENTLY_ONLY_ONE_QUIZ_AT_A_TIME___TO_BE_STORED_IN_SOLID_PROJECT";

const defaultQuiz = {
  name: "Quiz name",
  content: []
};

const defaultQuizTask = {
  question: "Question?",
  image: null,
  correct: "A",
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


export function hasSavedQuiz(){
  return !!localStorage.getItem(SAVE_KEY);
}


const dummyQuiz = {
  id: "the-dummy-quiz",
  questions: [
    {
      id: 1,
      text: "Question 1",
      correctAlternativeId: "A",
      alternatives: [
        {id: "A", text: "A"},
        {id: "B", text: "B"},
        {id: "C", text: "C"},
        {id: "D", text: "D"},
      ]
    },
    {
      id: 2,
      text: "Question 2",
      correctAlternativeId: "B",
      alternatives: [
        {id: "A", text: "A"},
        {id: "B", text: "B"},
        {id: "C", text: "C"},
        {id: "D", text: "D"},
      ]
    },
    {
      id: 3,
      text: "Question 3",
      correctAlternativeId: "C",
      alternatives: [
        {id: "A", text: "A"},
        {id: "B", text: "B"},
        {id: "C", text: "C"},
        {id: "D", text: "D"},
      ]
    }
  ]
};

export function loadQuizInHostableFormat(type){
  if(type !== "SAVED"){
    return dummyQuiz;
  }
  let rawQuiz = localStorage.getItem(SAVE_KEY);
  if(rawQuiz){
    try {
      let quiz = JSON.parse(rawQuiz);
      return {
        id: "that-one-saved-quiz",
        name: quiz.name,
        questions: quiz.content.map((q, index) => {
          return {
            id: "question-" + index,
            text: q.question,
            image: q.image,
            correctAlternativeId: q.correct,
            alternatives: [
              {id: "A", text: q.alternativeA},
              {id: "B", text: q.alternativeB},
              {id: "C", text: q.alternativeC},
              {id: "D", text: q.alternativeD},
            ]
          };
        })
      };
    } catch(err){
      console.error("Could not load quiz", {rawQuiz});
      return dummyQuiz;
    }
  }
}