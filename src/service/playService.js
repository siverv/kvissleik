import { batch, observable } from 'solid-js';
import { Durations, QuizState } from '../utils/controllerUtils';
import { addSignal } from '../utils/solidUtils';

export class JoinedQuizController {
  constructor(room){
    this.room = room;
    addSignal(this, "answerMap", new Map());
    addSignal(this, "quiz", {questions: []});
    addSignal(this, "score", {total: 0, added: 0, position: 0});
    addSignal(this, "state", {name: QuizState.LOBBY, data: {}});
    addSignal(this, "countdown", null);
    observable(this.state$).subscribe((value) => {
      console.log("state-change", value);
    });
    observable(this.room.host.data$).subscribe(({type, payload}) => {
      this.handleMessage(type, payload);
    });
  }

  hasAnsweredThisQuestion(){
    const {questionId} = this.state.data;
    return questionId != null ? this.answerMap.has(questionId) : true;
  }
  
  handleMessage(type, payload) {
    if(type === "STATE") {
      batch(() => {
        let {name, data} = payload;
        if([QuizState.ALTERNATIVES, QuizState.VALIDATION, QuizState.STATISTICS].includes(name)){
          data = {...this.state.data, ...data};
        }
        this.state = {name, data};
        let quiz = this.quiz;
        if(name === QuizState.QUESTION) {
          let question = {
            id: data.questionId,
            text: data.questionText,
            image: data.questionImage,
            alternatives: []
          };
          this.quiz = {
            ...quiz,
            questions: quiz.questions.concat(question)
          };
        } else if(name === QuizState.ALTERNATIVES) {
          this.quiz = {
            ...quiz,
            questions: quiz.questions.map(q => {
              if(q.id === data.questionId){
                return {
                  ...q,
                  alternatives: data.alternatives
                };
              } else return q;
            })
          };
        } else if(name === QuizState.VALIDATION) {
          this.quiz = {
            ...quiz,
            questions: quiz.questions.map(q => {
              if(q.id === data.questionId){
                return {
                  ...q,
                  correct: data.validation.correct
                };
              } else return q;
            })
          };
        }
        clearInterval(this.countdownIntervalId);
        if(Number.isFinite(Durations[name])){
          this.countdown = Durations[name];
          this.countdownIntervalId = setInterval(() => {
            this.countdown = Math.max(0, this.countdown - 1000);
            if(this.countdown <= 0){
              clearInterval(this.countdownIntervalId);
            }
          }, 1000);
        }
      });
    } else if(type === "STATISTICS") {
      const {position, total, added} = payload;
      this.score = {
        total,
        added,
        position,
        questionId: this.state.data.questionId
      };
    } else if(type === "RESULTS") {
      const {position, total} = payload;
      this.score = {
        total,
        position
      };
    }
  }

  setAnswer(alternativeId){
    if(this.state.name === QuizState.ALTERNATIVES && !this.hasAnsweredThisQuestion()) {
      this.answerMap = new Map(this.answerMap).set(this.state.data.questionId, alternativeId);
      this.room.toHost("SET_ANSWER", {alternativeId});
    }
  }
}

