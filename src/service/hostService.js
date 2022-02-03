import { observable } from 'solid-js';
import { addSignal } from '../utils/solidUtils';
import {QuizState, Durations} from '../utils/controllerUtils';
export class HostedQuizController {
  constructor(room, quiz){
    this.room = room;
    this.quiz = quiz;
    addSignal(this, "questionStateMap", new Map());
    addSignal(this, "scoreMap", new Map());
    addSignal(this, "state", {name: QuizState.LOBBY, data: {}});
    addSignal(this, "countdown", null);
    observable(this.state$).subscribe((state) => {
      this.room.broadcast("STATE", state);
      clearInterval(this.countdownIntervalId);
      if(Number.isFinite(Durations[state.name])){
        this.countdown = Durations[state.name];
        this.countdownIntervalId = setInterval(() => {
          this.countdown = Math.max(0, this.countdown - 1000);
          if(this.countdown <= 0){
            clearInterval(this.countdownIntervalId);
          }
        }, 1000);
      }
    });
    observable(this.room.data$).subscribe(({id, type, payload}) => {
      this.handleMessage(id, type, payload);
    });
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
    console.log(this.questionStateMap);
    for(let [questionId, questionState] of this.questionStateMap){
      for(let [participantId, state] of questionState) {
        scoreMap.set(participantId, (scoreMap.get(participantId) || new Map()).set(questionId, state.score));
      }
    }
    return scoreMap;
  }

  getNumberOfAnswered() {
    return this.questionStateMap.get(this.state.data.questionId).size || 0;
  }

  getScoreByParticipantId(participantId) {
    return Array.from(this.scoreMap().get(participantId)?.values()).reduce((a,b) => a+b, 0);
  }

  handleMessage(participantId, type, payload) {
    if(type === "SET_ANSWER" && this.state.name === QuizState.ALTERNATIVES) {
      const {alternativeId} = payload;
      const answerTimestamp = Date.now();
      const {questionId} = this.state.data;
      const question = this.quiz.questions.find(q => q.id === questionId);
      let questionStateMap = new Map(this.questionStateMap);
      let questionState = new Map(questionStateMap.get(questionId));
      if(!questionState.has(participantId)){
        const correct = question.correctAlternativeId === alternativeId;
        const timeToAnswer = answerTimestamp - this.state.data.alternativesTimestamp;
        console.log(question, alternativeId, correct, timeToAnswer, this.calculateScore(timeToAnswer, correct));
        questionState.set(participantId, {
          answer: alternativeId,
          answerTimestamp,
          timeToAnswer,
          correct,
          score: this.calculateScore(timeToAnswer, correct)
        });
      }
      this.questionStateMap = questionStateMap.set(questionId, questionState);
      if(questionState.size === this.room.participants.length){
        this.showValidation();
      }
    }
  }

  startQuiz(){
    if(this.state.name === QuizState.LOBBY) {
      this.toQuestion(this.quiz.questions[0].id);
    }
  }

  hasMoreQuestions(){
    let {questionId} = this.state.data;
    let currentIndex = this.quiz.questions.findIndex(q => q.id === questionId);
    return currentIndex + 1 < this.quiz.questions.length;
  }

  nextQuestion(){
    let {questionId} = this.state.data;
    let currentIndex = this.quiz.questions.findIndex(q => q.id === questionId);
    if(this.hasMoreQuestions()){
      this.toQuestion(this.quiz.questions[currentIndex+1].id);
    } else {
      this.toResults();
    }
  }

  toQuestion(id){
    const question = this.quiz.questions.find(q => q.id === id);
    this.questionStateMap = new Map(this.questionStateMap).set(question.id, new Map());
    this.state = {
      name: QuizState.QUESTION,
      data: {
        questionId: question.id,
        questionText: question.text,
        questionImage: question.image,
        questionTimestamp: Date.now()
      }
    };
    if(Number.isFinite(Durations.QUESTION)) {
      this.questionTimeoutId = setTimeout(() => this.showAlternatives(), Durations.QUESTION);
    }
  }

  showAlternatives(){
    clearInterval(this.questionTimeoutId);
    if(this.state.name === QuizState.QUESTION){
      const {questionId} = this.state.data;
      const question = this.quiz.questions.find(q => q.id === questionId);
      this.state = {
        name: QuizState.ALTERNATIVES,
        data: {
          ...this.state.data,
          alternativesTimestamp: Date.now(),
          alternatives: question.alternatives.map(alt => {
            return {
              id: alt.id,
              text: alt.text
            };
          })
        }
      };
      if(Number.isFinite(Durations.ALTERNATIVES)) {
        this.alternativesTimeoutId = setTimeout(() => this.showValidation(), Durations.ALTERNATIVES);
      }
    }
  }

  showValidation(){
    clearInterval(this.alternativesTimeoutId);
    if(this.state.name === QuizState.ALTERNATIVES) {
      const {questionId} = this.state.data;
      const {correctAlternativeId} = this.quiz.questions.find(q => q.id === questionId);
      this.state = {
        name: QuizState.VALIDATION,
        data: {
          ...this.state.data,
          validationTimestamp: Date.now(),
          validation: {
            correctAlternativeId
          }
        }
      };

      if(Number.isFinite(Durations.VALIDATION)) {
        this.validationTimeoutId = setTimeout(() => this.showStatistics(), Durations.VALIDATION);
      }
    }
  }

  showStatistics(){
    clearInterval(this.validationTimeoutId);
    if(this.state.name === QuizState.VALIDATION) {
      this.state = {
        name: QuizState.STATISTICS,
        data: {
          ...this.state.data,
          statisticsTimestamp: Date.now()
        }
      };

      let scoreMap = this.getScoreMap();
      let totalScoreMap = new Map(
        Array.from(scoreMap.entries())
          .map(([pId, sMap]) => [pId, Array.from(sMap.values()).reduce((a,b) => a+b, 0)])
      );
      let orderedByScore = Array.from(totalScoreMap.entries()).sort((a,b) => b[1] - a[1]);
      console.log(orderedByScore);
      for(let participant of this.room.participants) {
        participant.send("STATISTICS", {
          position: orderedByScore.findIndex(a => a[0] === participant.id) + 1,
          added: scoreMap.get(participant.id)?.get(this.state.data.questionId),
          total: totalScoreMap.get(participant.id)
        });
      }
    }
    if(Number.isFinite(Durations.STATISTICS)) {
      this.statisticsTimeoutId = setTimeout(() => this.toResults(), Durations.STATISTICS);
    }
  }

  toResults(){
    clearInterval(this.statisticsTimeoutId);
    this.state = {
      name: QuizState.RESULTS,
      data: {
        resultsTimestamp: Date.now()
      }
    };
    let scoreMap = this.getScoreMap();
    let totalScoreMap = new Map(
      Array.from(scoreMap.entries())
        .map(([pId, sMap]) => [pId, Array.from(sMap.values()).reduce((a,b) => a+b, 0)])
    );
    let orderedByScore = Array.from(totalScoreMap.entries()).sort((a,b) => b[1] - a[1]);
    for(let participant of this.room.participants) {
      participant.send("RESULTS", {
        position: orderedByScore.findIndex(a => a[0] === participant.id) + 1,
        total: totalScoreMap.get(participant.id)
      });
    }
    if(Number.isFinite(Durations.RESULTS)) {
      this.resultsTimeoutId = setTimeout(() => this.theEnd(), Durations.RESULTS);
    }
  }

  theEnd(){
    clearInterval(this.resultsTimeoutId);
    this.state = {
      name: QuizState.THE_END,
      data: {
        resultsTimestamp: Date.now()
      }
    };
    for(let participant of this.room.participants) {
      participant.send("RESULTS", {
        position: 1,
        total: 4000
      });
    }
  }
}