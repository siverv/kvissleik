import { onCleanup, createMemo, Switch, Match} from "solid-js";
import { JoinedQuizController } from '../../service/playService';
import { DisplayQuiz } from '../ui/DisplayQuiz';
import { ParticipantList } from '../ui/ParticipantList';
import { QuizState } from '../../utils/controllerUtils';


function UnexpectedErrorWhilePlaying({error, reset, quit}){
  return <>
    <details open>
      <summary>
        Something unexpected went wrong.
      </summary>
      <pre>
        {error}
      </pre>
    </details>
    <button onClick={reset}>
      Try to recover
    </button>
    <button onClick={quit}>
      Quit
    </button>
  </>;
}


function PlayingLobby({ctrl}){
  return <>
    <h3>
      Waiting for host to start game.
    </h3>
    <Show when={ctrl.roomInfo}>
      <p>
        {ctrl.getParticipants().length} joined out of {ctrl.getMaxParticipants()} possible.
      </p>
    </Show>
  </>;
}

function PlayingQuestion({ctrl, question}){
  const escapeZen = (ev) => {
    if(ev.key === "Escape"){
      delete document.body.dataset.zen;
    }
  };
  document.body.dataset.zen = "true";
  window.addEventListener("keydown", escapeZen);
  onCleanup(() => {
    window.removeEventListener("keydown", escapeZen);
    delete document.body.dataset.zen;
  });
  const getAnswer = createMemo(() => ctrl.answerMap.get(ctrl.state.data.question.id));
  return <>
    <DisplayQuiz
      question={question}
      countdown={ctrl.countdown >= 0 ? <>{Math.floor(ctrl.countdown / 1000)}</> : null}
      correct={question.correct}
      statistics={question.statistics}
      getAnswer={getAnswer}
      getScore={createMemo(() => ctrl.score.questionId == ctrl.state.data.question.id ? ctrl.score : undefined)}
      Alternative={ctrl.state.name === "ALTERNATIVES" ? (props) => <button {...props}
        disabled={getAnswer() || undefined}
        onClick={() => {
          ctrl.setAnswer(question.alternatives[props.index()].id);
        }}
      /> : undefined}
    />
  </>;
}

function DisplayFinalResults({ctrl, results}) {
  return <>
    <h3>You are #{ctrl.score.position} with a score of {ctrl.score.total}</h3>

    <h3>And the results are....</h3>
    <ParticipantList getParticipants={() => {
      return results.map(({participantName, participantId}) => ({id: participantId, name: participantName, state: "CONNECTED"}));
    }} getCurrentStandings={() => results} limit={3}/>
  </>;
}

export function Playing({room, quit}){
  const ctrl = new JoinedQuizController(room);
  return <ErrorBoundary fallback={(error, reset) => <UnexpectedErrorWhilePlaying error={error} reset={reset} quit={quit}/>}>
    <section class="hosting-quiz">
      <Switch fallback={() => <PlayingLobby ctrl={ctrl}/>}>
        <Match when={!ctrl.isConnected()}>
          <p>
            Reconnecting...
          </p>
        </Match>
        <Match when={ctrl.getCurrentQuestion()}>
          {(question) => <PlayingQuestion ctrl={ctrl} question={question}/>}
        </Match>
        <Match when={ctrl.state.name === QuizState.RESULTS}>
          {() => <DisplayFinalResults ctrl={ctrl} results={ctrl.getCurrentStandings()}/>}
        </Match>
        <Match when={false}>
          <h3>
            Thank you for playing.
          </h3>
          <p>
            Want to share or save the results?
            <textarea>
            </textarea>
            <button type="button">
              copy results to clipboard.
            </button>
          </p>
          <p>
            Want to share or save the quiz?
            <textarea>
            </textarea>
            <button type="button">
              copy quiz to clipboard.
            </button>
          </p>
          <button type="button" onClick={quit}>
            Exit game
          </button>
        </Match>
      </Switch>
    </section>
    <aside>
      <button type="button" onClick={quit}>
        Quit
      </button>
    </aside>
  </ErrorBoundary>;
}
