import { createSignal } from "solid-js";
import {createDefaultQuiz} from './makeService';

function saveJson(key, json){
  localStorage.setItem(key, JSON.stringify(json));
}

function loadJson(key){
  let raw = localStorage.getItem(key);
  if(!raw){
    let defaultQuiz = createDefaultQuiz();
    return [[defaultQuiz.id, defaultQuiz]];
  }
  try {
    return JSON.parse(raw);
  } catch(err){
    console.log("Bad format for json with key: " + key, raw);
  }
}
  
export const COLLECTION_KEY = "QUIZ_COLLECTION";
export const centralizedCollectionSignal = createSignal(new Map(loadJson(COLLECTION_KEY)));

export function getQuizCollection(){
  const [collection, setCollection] = centralizedCollectionSignal;
  function updateCollection(collection) {
    saveJson(COLLECTION_KEY, Array.from(collection));
    setCollection(collection);
  }
  return {
    list: () => Array.from(collection().values()),
    get: (id) => collection().get(id),
    store: (quiz) => updateCollection(new Map(collection()).set(quiz.id, quiz)),
    remove: (id) => {
      let map = new Map(collection());
      map.delete(id);
      updateCollection(map);
    }
  };
}
