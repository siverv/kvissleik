import { observable, createSignal } from 'solid-js';
import {QuizState, Durations} from '../utils/controllerUtils';

export const initialState = {name: QuizState.LOBBY, data: {}};

class HostQuizState {
  stateSignal = createSignal(initialState);
  get state(){
    return this.stateSignal[0]();
  }
  setState(state){
    this.stateSignal[1](state);
  }
  stateObservable = observable(this.stateSignal[0]);

  constructor(quiz){
    this.quiz = quiz;
  }

  subscribe(callback){
    return this.stateObservable.subscribe(callback);
  }

  next(){
    let newState = this.getNextState(this.state);
    if(newState){
      this.setState(newState);
    }
  }

  getNextState(state){
    switch(this.state.name){
      case QuizState.LOBBY: return this.toQuestion(this.quiz.questions[0].id);
      case QuizState.QUESTION: return this.showAlternatives(state);
      case QuizState.ALTERNATIVES: return this.showValidation(state);
      case QuizState.VALIDATION: return this.showStatistics(state);
      case QuizState.STATISTICS: return this.nextQuestion(state);
      case QuizState.RESULTS: return this.theEnd();
    }
    return state;
  }

  nextQuestion(state){
    const id = state.data.question?.id;
    let currentIndex = this.quiz.questions.findIndex(q => q.id === id);
    if(currentIndex + 1 < this.quiz.questions.length){
      return this.toQuestion(this.quiz.questions[currentIndex + 1].id);
    } else {
      return this.showResults();
    }
  }

  toQuestion(id){
    const question = this.quiz.questions.find(q => q.id === id);
    this.questionStateMap = new Map(this.questionStateMap).set(question.id, new Map());
    return {
      name: QuizState.QUESTION,
      data: {
        question: {
          id: question.id,
          text: question.text,
          image: question.image,
        },
        questionTimestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString()
    };
  }

  showAlternatives(state){
    const id = state.data.question.id;
    const question = this.quiz.questions.find(q => q.id === id);
    return {
      name: QuizState.ALTERNATIVES,
      data: {
        ...state.data,
        question: {
          ...state.data.question,
          alternatives: question.alternatives.map(alt => {
            return {
              id: alt.id,
              text: alt.text
            };
          })
        },
        alternativesTimestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString()
    };
  }

  showValidation(state){
    const id = state.data.question.id;
    const question = this.quiz.questions.find(q => q.id === id);
    return {
      name: QuizState.VALIDATION,
      data: {
        ...state.data,
        question: {
          ...state.data.question,
          correct: question.correct
        },
        validationTimestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString()
    };
  }

  showStatistics(state){
    return {
      name: QuizState.STATISTICS,
      data: {
        ...state.data,
        statisticsTimestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString()
    };
  }

  showResults(){
    return {
      name: QuizState.RESULTS,
      data: {
        resultsTimestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString()
    };
  }

  theEnd(){
    return {
      name: QuizState.THE_END,
      data: {
        theEndTimestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString()
    };
  }
}

class ResultState {
  constructor(quiz){
    this.quiz = quiz;
    this.questionStateMapSignal = createSignal(new Map());
    this.questionStateObservable = observable(this.questionStateMapSignal[0]);
  }

  get questionStateMap(){
    return this.questionStateMapSignal[0]();
  }

  subscribe(callback){
    return this.questionStateObservable.subscribe(callback);
  }

  setAnswer(questionId, participantId, alternativeId, state){
    const answerTimestamp = new Date();
    const question = this.quiz.questions.find(q => q.id === questionId);
    let questionStateMap = new Map(this.questionStateMap);
    let questionState = new Map(questionStateMap.get(questionId));
    if(!questionState.has(participantId)){
      const correct = question.correct === alternativeId;
      const timeToAnswer = answerTimestamp - new Date(state.data.alternativesTimestamp);
      questionState.set(participantId, {
        answer: alternativeId,
        answerTimestamp,
        timeToAnswer,
        correct,
        score: this.calculateScore(timeToAnswer, correct)
      });
      this.questionStateMapSignal[1](questionStateMap.set(questionId, questionState));
    }
  }

  calculateScore(timeToAnswer, correct){
    if(Number.isFinite(Durations.ALTERNATIVES)){
      return correct ? Math.round(1000 * Math.min(1, (Durations.ALTERNATIVES + 1000 - timeToAnswer) / Durations.ALTERNATIVES)) : 0;
    } else {
      return correct ? 1000 : 0;
    }
  }


  getScoreMap() {
    let scoreMap = new Map();
    for(let [questionId, questionState] of this.questionStateMap){
      for(let [participantId, state] of questionState) {
        scoreMap.set(participantId, (scoreMap.get(participantId) || new Map()).set(questionId, state.score));
      }
    }
    return scoreMap;
  }

  getTotalScoreMap(excludeQuestionId){
    let scoreMap = this.getScoreMap();
    return new Map(
      Array.from(scoreMap.entries())
        .map(([pId, sMap]) => [
          pId,
          Array.from(sMap.entries())
            .map(([qId, score]) => qId === excludeQuestionId ? 0 : score)
            .reduce((a,b) => a+b, 0)
        ])
    );
  }

  getResultList(excludeQuestionId){
    let totalScoreMap = this.getTotalScoreMap(excludeQuestionId);
    let orderedByScore = Array.from(totalScoreMap.entries()).sort((a,b) => b[1] - a[1]);
    return orderedByScore;
  }

  getQuestionStatistics(questionId){
    return Array.from(this.questionStateMap.get(questionId)?.values() || [])
      .reduce((map, {answer}) => map.set(answer, (map.get(answer)||0) + 1), new Map());
  }
}

export class HostedQuizController {
  countdownSignal = createSignal();
  get countdown(){
    return this.countdownSignal[0]();
  }
  set countdown(value){
    this.countdownSignal[1](value);
  }

  constructor(room){
    this.room = room;
    this.quiz = room.config.quiz;
    this.quizState = new HostQuizState(this.quiz);
    this.resultState = new ResultState(this.quiz);
    this.startCountdown(true);
    this.autoTransitionOnAllAnswered();
    this.broadcastState();
    this.sendStatistics();
    this.sendResults();
    this.roomSubscription = this.room.subscribe(this.handleMessage.bind(this));
  }

  cleanup(){
    this.roomSubscription.unsubscribe();
  }

  isConnected(){
    return true;
  }

  get state() {
    return this.quizState.state;
  }

  start(){
    this.quizState.next();
  }

  next(){
    this.quizState.next();
  }

  autoTransitionOnAllAnswered(){
    return this.resultState.subscribe(questionStateMap => {
      if(this.state.name === QuizState.ALTERNATIVES){
        let id = this.state.data.question.id;
        let questionState = questionStateMap.get(id);
        if(questionState?.size === this.getParticipants().length){
          this.quizState.next();
        }
      }
    });
  }

  startCountdown(autoTransition){
    return this.quizState.subscribe(state => {
      clearInterval(this.countdownIntervalId);
      if(Number.isFinite(Durations[state.name])){
        this.countdown = Durations[state.name];
        this.countdownIntervalId = setInterval(() => {
          this.countdown = Math.max(0, this.countdown - 1000);
          if(this.countdown <= 0){
            clearInterval(this.countdownIntervalId);
            if(autoTransition){
              this.next();
            }
          }
        }, 1000);
      }
    });
  }

  broadcastState(){
    // let previousStateData;
    return this.quizState.subscribe((state) => {
      let data = state.data;
      // if([QuizState.ALTERNATIVES, QuizState.VALIDATION, QuizState.STATISTICS].includes(state.name)){
      //   data = Object.fromEntries(Object.entries(state.data).filter(([key]) => !previousStateData[key]));
      // } else {
      //   data = state.data;
      // }
      this.room.broadcast("STATE", {...state, data});
      // previousStateData = data;
    });
  }

  sendStatistics(){
    return this.quizState.subscribe(state => {
      if(state.name === QuizState.STATISTICS){
        const scoreMap = this.resultState.getScoreMap();
        const totalScoreMap = this.resultState.getTotalScoreMap();
        const resultList = this.resultState.getResultList();
        const currentStandings = this.getCurrentStandings();
        for(let participant of this.getParticipants()) {
          participant.send("STATISTICS", {
            position: resultList.findIndex(a => a[0] === participant.id) + 1,
            added: scoreMap.get(participant.id)?.get(state.data.question.id),
            total: totalScoreMap.get(participant.id),
            currentStandings
          });
        }
      }
    });
  }

  sendResults(){
    return this.quizState.subscribe(state => {
      if(state.name === QuizState.RESULTS){
        const totalScoreMap = this.resultState.getTotalScoreMap();
        const resultList = this.resultState.getResultList();
        const currentStandings = this.getCurrentStandings();
        for(let participant of this.getParticipants()) {
          participant.send("RESULTS", {
            position: resultList.findIndex(a => a[0] === participant.id) + 1,
            total: totalScoreMap.get(participant.id),
            currentStandings
          });
        }
      }
    });
  }

  handleMessage({participant, type, payload}) {
    if(type === "SET_ANSWER" && this.state.name === QuizState.ALTERNATIVES) {
      const participantId = participant.id;
      const id = this.state.data.question.id;
      const {alternativeId} = payload;
      this.resultState.setAnswer(id, participantId, alternativeId, this.state);
    } else if(type === "REQUEST_STATE"){
      participant.send("RESTORE_STATE", this.state);
    }
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
          statistics: this.resultState.getQuestionStatistics(questionId)
        };
      }
    }
    return null;
  }

  getScoreMap() {
    return this.resultState.getScoreMap();
  }
  getResultList() {
    const excludeQuestionId = this.state.name === QuizState.STATISTICS ? null : this.state.data.question?.id;
    return this.resultState.getResultList(excludeQuestionId);
  }

  kick(participant){
    return this.room.removeParticipant(participant);
  }

  getParticipants(){
    return this.room.getParticipants();
  }

  getMaxParticipants(){
    return this.room.config.maxParticipants;
  }

  getCurrentStandings(){
    let participants = this.getParticipants();
    let scoreMap = this.getScoreMap();
    let resultList = this.getResultList();
    let questionId = this.state.data.question?.id;
    const shouldIncludeCurrentQuestion = this.state.name === QuizState.STATISTICS;
    const getScoreForCurrentQuestion = pId => scoreMap.get(pId)?.get(questionId);
    return resultList.map(([pId, score]) => {
      let participant = participants.find(p => p.id === pId);
      let scoreForCurrentQuestion = getScoreForCurrentQuestion(pId);
      return {
        participantId: participant.id,
        participantName: participant.name,
        score: score,
        added: shouldIncludeCurrentQuestion ? scoreForCurrentQuestion : undefined,
        position: resultList.findIndex(([_, s]) => s <= score) + 1
      };
    });
  }

  getNumberOfAnswered() {
    return this.questionStateMap.get(this.state.data.question.id).size || 0;
  }
}