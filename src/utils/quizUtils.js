import { createSignal } from "solid-js";

export function signalifyQuizTask(jsonQuizTask){
  return createSignal(jsonQuizTask);
}

export function signalifyQuiz(jsonQuiz){
  return createSignal({
    name: createSignal(jsonQuiz.name),
    content: jsonQuiz.content.map(signalifyQuizTask)
  });
}

export function jsonifyQuizTask([getQuizTask]){
  return {
    ...getQuizTask()
  };
}

export function jsonifyQuiz([getQuiz]){
  let quiz = getQuiz();
  return {
    name: quiz.name[0](),
    content: quiz.content.map(jsonifyQuizTask)
  };
}
