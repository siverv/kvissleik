import {onCleanup} from 'solid-js';
import { HostedQuizController } from '../../service/hostService';
import { QuizState } from '../../utils/controllerUtils';
import { DisplayQuiz } from '../ui/DisplayQuiz';

function UnexpectedErrorWhileHosting({error, reset, quit}){
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

function HostingLobby({ctrl}){
  return <>
    <Dynamic component={ctrl.room.server.constructor.HostConnectionDetails} server={ctrl.room.server}/>
    <p>
      {ctrl.getParticipants().length} joined out of {ctrl.getMaxParticipants()} possible.
    </p>
    <ul>
      <For each={ctrl.getParticipants()} fallback={"..."}>
        {participant => <li>
          {participant.name} [{participant.state}]
          <button type="button" onClick={() => ctrl.kick(participant)}>
            Kick
          </button>
        </li>}
      </For>
    </ul>
    <button class="start-quiz" onClick={() => ctrl.start()}>
      Start quiz
    </button>
  </>;
}

function HostingQuestion({ctrl, question}){
  const next = () => ctrl.next();
  const escapeZen = (ev) => {
    if(ev.key === "Escape"){
      delete document.body.dataset.zen;
    }
  }
  document.body.dataset.zen = "true";
  window.addEventListener("click", next);
  window.addEventListener("keydown", escapeZen);
  onCleanup(() => {
    window.removeEventListener("click", next);
    window.removeEventListener("keydown", escapeZen);
    delete document.body.dataset.zen;
  });
  return <>
    <DisplayQuiz
      question={question}
      countdown={ctrl.countdown >= 0 ? <>{Math.floor(ctrl.countdown / 1000)}</> : null}
      details={ctrl.state.name === QuizState.ALTERNATIVE ? <>{ctrl.getNumberOfAnswered()}/{ctrl.room.participants.length}</> : undefined}
      correct={question.correct}
      statistics={question.statistics}
    />
    <p>
      Click anywhere to continue...
    </p>
    <aside>
      <ul>
        <For each={ctrl.getCurrentStandings()}>
          {({participantName, position, score, connectionState}) => <li>
            #{position}: {participantName}: {score}
            [{connectionState}]
          </li>}
        </For>
      </ul>
    </aside>
  </>
}

function DisplayFinalResults({results}) {
  return <>
    <h3>And the results are....</h3>
    <ul>
      <For each={results}>
        {({participantName, position, score, connectionState}) => <li>
          #{position}: {participantName}: {score}
            [{connectionState}]
        </li>}
      </For>
    </ul>
  </>
}

export function Hosting({room, quit}){
  const ctrl = new HostedQuizController(room);
  return <ErrorBoundary fallback={(error, reset) => <UnexpectedErrorWhileHosting error={error} reset={reset} quit={quit}/>}>
    <section class="hosting-quiz">
      <Switch fallback={() => <HostingLobby ctrl={ctrl}/>}>
        <Match when={!ctrl.isConnected()}>
          <p>
            Reconnecting...
          </p>
        </Match>
        <Match when={ctrl.getCurrentQuestion()}>
          {(question) => <HostingQuestion ctrl={ctrl} question={question}/>}
        </Match>
        <Match when={ctrl.state.name === QuizState.RESULTS}>
          {() => <DisplayFinalResults results={ctrl.getCurrentStandings()}/>}
        </Match>
        <Match when={ctrl.state.name === QuizState.THE_END}>
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
  </ErrorBoundary>
}