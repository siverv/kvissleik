import { newId } from "../utils/cryptoUtils";
import { sanitizeHTML, sanitizePlaintext } from "../utils/textUtils";

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

export function createDummyQuiz(){
  return {
    id: newId(),
    name: "Dummy quiz",
    questions: Array.from({length: 3}).map(createNewQuestion)
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

export function duplicateQuiz(quiz){
  let idMap = new Map();
  function convertId(id) {
    return idMap.get(id) || idMap.set(id, newId()).get(id);
  }
  let isACopiedName = quiz.name.match(/ #(\d+)$/);
  let name = isACopiedName ? quiz.name.replace(/ #\d+$/, " #" + (parseInt(isACopiedName[1]) + 1)) : quiz.name + " #2";
  return {
    id: convertId(quiz.id),
    name: sanitizePlaintext(name),
    questions: quiz.questions.map(question => {
      return {
        ...question,
        text: sanitizeHTML(question.text || ""),
        id: convertId(question.id),
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
