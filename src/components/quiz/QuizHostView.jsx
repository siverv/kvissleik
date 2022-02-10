import { useContext } from 'solid-js';
import { HostedQuizController } from '../../service/hostService';
import { ControllerContext, QuizState } from '../../utils/controllerUtils';
import { DisplayQuiz } from '../ui/DisplayQuiz';


const StateViews = {
  [QuizState.LOBBY]: function QuizHostView_Lobby(){
    const ctrl = useContext(ControllerContext);
    return <>
      <ul>
        <For each={ctrl.room.participants} fallback={"..."}>
          {participant => <li>{participant.name}: {participant.connected ? "yes" : "no"}</li>}
        </For>
      </ul>
      <button onClick={() => ctrl.startQuiz()}>
        start quiz
      </button>
    </>;
  },
  [QuizState.QUESTION]: function QuizHostView_Question(){
    const ctrl = useContext(ControllerContext);
    const question = ctrl.quiz.questions.find(q => q.id === ctrl.state.data.questionId);
    return <>
      <DisplayQuiz
        question={{...question, alternatives: null}}
        countdown={<>{Math.floor(ctrl.countdown / 1000)}</>}
      />
      <button onClick={() => ctrl.showAlternatives()}>
        show alternatives
      </button>
    </>;
  },
  [QuizState.ALTERNATIVES]: function QuizHostView_Alternatives(){
    const ctrl = useContext(ControllerContext);
    const question = ctrl.quiz.questions.find(q => q.id === ctrl.state.data.questionId);
    return <>
      <DisplayQuiz
        question={{...question}}
        countdown={<>{Math.floor(ctrl.countdown / 1000)}</>}
        details={<>{ctrl.getNumberOfAnswered()}/{ctrl.room.participants.length}</>}
      />
      <button onClick={() => ctrl.showValidation()}>
        show validation
      </button>
    </>;
  },
  [QuizState.VALIDATION]: function QuizHostView_Validation(){
    const ctrl = useContext(ControllerContext);
    const question = ctrl.quiz.questions.find(q => q.id === ctrl.state.data.questionId);
    const statistics = Array.from(ctrl.questionStateMap.get(question.id)?.values())
      .reduce((map, {answer}) => map.set(answer, (map.get(answer)||0) + 1), new Map());
    return <>
      <DisplayQuiz
        question={{...question}}
        correct={question.correct}
        statistics={statistics}
      />
      <button onClick={() => ctrl.showStatistics()}>
        show statistics
      </button>
    </>;
  },
  [QuizState.STATISTICS]: function QuizHostView_Statistics(){
    const ctrl = useContext(ControllerContext);
    const questionState = ctrl.questionStateMap.get(ctrl.state.data.questionId);
    return <article class="quiz quiz-host">
      <ul>
        <For each={ctrl.room.participants} fallback={"..."}>
          {participant => <li>{participant.name}: {questionState.get(participant.id)?.score}</li>}
        </For>
      </ul>
      <button onClick={() => ctrl.nextQuestion()}>
        {ctrl.hasMoreQuestions() ? "next question": "show results"}
      </button>
    </article>;
  },
  [QuizState.RESULTS]: function QuizHostView_Results(){
    const ctrl = useContext(ControllerContext);
    return <article class="quiz-results">
      <ol>
        <For each={Array.from(ctrl.getResultList())}>
          {([id, score]) => {
            return <li>
              {ctrl.getParticipantName(id)}, with a score of {score}
            </li>;
          }}
        </For>
      </ol>
    </article>;
  },
  [QuizState.THE_END]: function QuizHostView_TheEnd(){
    return <pre>the end</pre>;
  }
};


export function QuizHostView({room, quiz}){
  const ctrl = new HostedQuizController(room, quiz);
  return <ControllerContext.Provider value={ctrl}>
    <h3>
      Room code: {room().roomCode}
    </h3>
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