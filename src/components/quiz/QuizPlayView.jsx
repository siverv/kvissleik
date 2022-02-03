import { createMemo, useContext } from 'solid-js';
import { JoinedQuizController } from '../../service/playService';
import { ControllerContext, Durations, QuizState } from '../../utils/controllerUtils';
import { DisplayQuiz } from '../ui/DisplayQuiz';


const StateViews = {
  [QuizState.LOBBY]: function QuizPlayView_Lobby(){
    const ctrl = useContext(ControllerContext);
    return <h3>
      {ctrl.room.host.connected ? "Waiting for host to start..." : "Connecting to host..."}
    </h3>;
  },
  [QuizState.QUESTION]: function QuizPlayView_Question(){
    const ctrl = useContext(ControllerContext);
    const question = ctrl.quiz.questions.find(q => q.id === ctrl.state.data.questionId);
    return <DisplayQuiz
      question={question}
      countdown={<>{Math.floor(ctrl.countdown / 1000)}</>}
    />;
  },
  [QuizState.ALTERNATIVES]: function QuizPlayView_Alternatives(){
    const ctrl = useContext(ControllerContext);
    const question = ctrl.quiz.questions.find(q => q.id === ctrl.state.data.questionId);
    const getAnswer = createMemo(() => ctrl.answerMap.get(ctrl.state.data.questionId));
    return <DisplayQuiz
      question={question}
      getAnswer={getAnswer}
      Alternative={(props) => <button {...props}
        disabled={getAnswer() || undefined}
        onClick={() => {
          ctrl.setAnswer(props["data-id"]);
        }}
      />}
      countdown={<>{Math.floor(ctrl.countdown / 1000)}</>}
    />;
  },
  [QuizState.VALIDATION]: function QuizPlayView_Validation(){
    const ctrl = useContext(ControllerContext);
    const question = ctrl.quiz.questions.find(q => q.id === ctrl.state.data.questionId);
    return <DisplayQuiz
      question={question}
      getAnswer={createMemo(() => ctrl.answerMap.get(ctrl.state.data.questionId))}
      correct={question.correctAlternativeId}
    />;
  },
  [QuizState.STATISTICS]: function QuizPlayView_Statistics(){
    const ctrl = useContext(ControllerContext);
    return <article class="quiz quiz-play state--statistics">
      <h4>
        You have {ctrl.score.total}. <br/>
        You got {ctrl.score.added}. <br/>
        Your position is {ctrl.score.position}.
      </h4>
    </article>;
  },
  [QuizState.RESULTS]: function QuizPlayView_Results(){
    const ctrl = useContext(ControllerContext);
    return <article class="quiz quiz-play state--results">
      <h3>
        #{ctrl.score.position}
      </h3> 
      <h4>
        {ctrl.score.total}
      </h4>
    </article>;
  },
  [QuizState.THE_END]: function QuizPlayView_TheEnd(){
    return <article class="quiz quiz-play state--the-end">
      the end;
      <br/>
      <a href="/">
        Back to home page.
      </a>
    </article>;
  },
};


export function QuizPlayView({room}){
  const ctrl = new JoinedQuizController(room);
  return <ControllerContext.Provider value={ctrl}>
    <Switch>
      {Array.from(Object.entries(StateViews)).map(([stateName, Component]) => {
        return <Match when={ctrl.state.name === stateName}>
          {() => <div class={"state-view quiz-play state--" + stateName}>
            <Component/>
          </div>}
        </Match>;
      })}
    </Switch>
  </ControllerContext.Provider>;
}