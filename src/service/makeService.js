import { sanitizeHTML, sanitizePlaintext } from "../utils/textUtils";
import defaultQuiz from '../assets/default-quiz.json';


export function newId(segments = 4) {
  const array = new Uint32Array(segments);
  crypto.getRandomValues(array);
  let id = "";
  for (let i = 0; i < array.length; i++) {
    id += (i ? "-" : "") + array[i].toString(36);
  } 
  return id;
}

export function createNewQuestion(){
  let correct = newId();
  return {
    id: newId(),
    text: "Question?",
    correct,
    alternatives: [
      {id: correct, text: "A"},
      {id: newId(), text: "B"},
      {id: newId(), text: "C"},
      {id: newId(), text: "D"},
    ]
  };
}

export function createQuiz(){
  return {
    id: newId(),
    name: "New quiz",
    questions: [
      createNewQuestion()
    ]
  };
}

export function createDefaultQuiz(){
  return duplicateQuiz(defaultQuiz);
}

export function duplicateQuiz(quiz, keepName=false){
  let idMap = new Map();
  function convertId(id) {
    return idMap.get(id) || idMap.set(id, newId()).get(id);
  }
  let name;
  if(keepName){
    name = quiz.name;
  } else {
    let isACopiedName = quiz.name.match(/ #(\d+)$/);
    name = isACopiedName ? quiz.name.replace(/ #\d+$/, " #" + (parseInt(isACopiedName[1]) + 1)) : quiz.name + " #2";
  }
  return {
    id: convertId(quiz.id),
    name: sanitizePlaintext(name),
    questions: quiz.questions.map(question => {
      return {
        ...question,
        text: sanitizeHTML(question.text || ""),
        id: convertId(question.id),
        correct: question.correct && convertId(question.correct),
        alternatives: question.alternatives.map(alt => {
          return {
            ...alt,
            text: sanitizeHTML(alt.text || ""),
            id: convertId(alt.id)
          };
        })
      };
    })
  };
}
