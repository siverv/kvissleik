import { batch, observable, createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Durations, QuizState } from '../utils/controllerUtils';
import {initialState} from './hostService';


class PlayQuizState {
  stateSignal = createSignal(initialState);
  get state(){
    return this.stateSignal[0]();
  }
  setState(state){
    this.stateSignal[1](state);
  }
  stateObservable = observable(this.stateSignal[0]);

  subscribe(callback){
    return this.stateObservable.subscribe(callback);
  }

  applyState(state){
    let {name, data} = state;
    // if([QuizState.ALTERNATIVES, QuizState.VALIDATION, QuizState.STATISTICS].includes(name)){
    //   data = {...this.state.data, ...data};
    // }
    this.setState({name, data});
    return {name, data};
  }

  restoreState(state){
    this.setState(state);
  }
}

export class JoinedQuizController {
  quizSignal = createSignal({questions: []});
  get quiz(){
    return this.quizSignal[0]();
  }
  set quiz(value){
    this.quizSignal[1](value);
  }
  store = createStore({
    score: {total: 0, added: 0, position: 0},
    answerMap: new Map()
  });
  get answerMap(){
    return this.store[0].answerMap;
  }
  set answerMap(value){
    this.store[1]("answerMap", new Map(value));
  }
  get score(){
    return this.store[0].score;
  }
  set score(value){
    this.store[1]("score", value);
  }
  get currentStandings(){
    return this.store[0].currentStandings;
  }
  set currentStandings(value){
    this.store[1]("currentStandings", value);
  }

  countdownSignal = createSignal();
  get countdown(){
    return this.countdownSignal[0]();
  }
  set countdown(value){
    this.countdownSignal[1]();
  }

  get state(){
    return this.quizState.state;
  }

  set state(value){
    this.quizState.setState(value);
  }

  constructor(room){
    this.room = room;
    this.quizState = new PlayQuizState();
    this.startCountdown();
    this.roomSubscription = this.room.subscribe(this.handleMessage.bind(this));
  }

  cleanup(){
    this.roomSubscription.unsubscribe();
  }

  isConnected(){
    return true;
  }


  startCountdown(){
    return this.quizState.subscribe(state => {
      clearInterval(this.countdownIntervalId);
      if(Number.isFinite(Durations[state.name])){
        const spentTime = (Date.now() - new Date(state.timestamp));
        this.countdown = Math.max(0, Durations[state.name] - spentTime);
        this.countdownIntervalId = setInterval(() => {
          this.countdown = Math.max(0, this.countdown - 1000);
          if(this.countdown <= 0){
            clearInterval(this.countdownIntervalId);
          }
        }, 1000);
      }
    });
  }

  getCurrentQuestion(){
    let questionId = this.state.data.question?.id;
    if(!questionId){
      return null;
    }
    let currentQuestion = this.quiz.questions.find(q => q.id === questionId);
    if(!currentQuestion){
      return null;
    }
    switch(this.state.name){
      case QuizState.QUESTION: return {
        ...currentQuestion,
        alternatives: [],
        correct: null
      };
      case QuizState.ALTERNATIVES: return {
        ...currentQuestion,
        correct: null,
      };
      case QuizState.VALIDATION: return {
        ...currentQuestion
      };
      case QuizState.STATISTICS: {
        return {
          ...currentQuestion,
          score: this.score
        };
      }
    }
    return null;
  }

  getParticipants(){
    return []; //this.room.getParticipants();
  }

  getMaxParticipants(){
    return 1000; //this.room.config.maxParticipants;
  }

  getCurrentStandings(){
    return this.currentStandings || [];
  }


  hasAnsweredThisQuestion(){
    const questionId = this.state.data.question.id;
    return questionId != null ? this.answerMap.has(questionId) : true;
  }
  
  handleMessage({type, payload}) {
    if(type === "STATE") {
      let newState = this.quizState.applyState(payload);
      this.quiz = this.updateQuiz(this.quiz, newState);
    } else if(type === "RESTORE_STATE"){
      batch(() => {
        this.quizState.restoreState(payload);
        this.quiz = this.updateQuiz(this.quiz, payload);
      });
    } else if(type === "STATISTICS") {
      const {position, total, added, currentStandings} = payload;
      this.score = {
        total,
        added,
        position,
        questionId: this.state.data.question.id
      };
      this.currentStandings = currentStandings;
    } else if(type === "RESULTS") {
      const {position, total, currentStandings} = payload;
      this.score = {
        total,
        position
      };
      this.currentStandings = currentStandings;
    }
  }

  updateQuiz(quiz, state){
    let questionId = state.data.question?.id;
    let question = quiz.questions.find(q => q.id === questionId);
    if(!question){
      return {
        ...quiz,
        questions: quiz.questions.concat(state.data.question)
      };
    } else if(questionId){
      return {
        ...quiz,
        questions: quiz.questions.map(q => {
          if(q.id === questionId){
            return {
              ...q,
              ...state.data.question
            };
          } else return q;
        })
      };
    } else return quiz;
  }

  setAnswer(alternativeId){
    if(this.state.name === QuizState.ALTERNATIVES && !this.hasAnsweredThisQuestion()) {
      this.answerMap = new Map(this.answerMap).set(this.state.data.question.id, alternativeId);
      this.room.toHost("SET_ANSWER", {alternativeId});
    }
  }
}

