import {onCleanup} from 'solid-js';
import { HostedQuizController } from '../../service/hostService';
import { QuizState } from '../../utils/controllerUtils';
import { DisplayQuiz } from '../ui/DisplayQuiz';
import {ParticipantList, LobbyList} from '../ui/ParticipantList';
import "./Hosting.css";

function UnexpectedErrorWhileHosting({error, reset, quit}){
  console.error(error);
  return <>
    <details open>
      <summary>
        Something unexpected went wrong.
      </summary>
      <pre>
        {error?.toString()}
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
    <LobbyList max={ctrl.getMaxParticipants()} getParticipants={ctrl.getParticipants.bind(ctrl)} kick={ctrl.kick.bind(ctrl)}/>
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
  // window.addEventListener("click", next);
  window.addEventListener("keydown", escapeZen);
  onCleanup(() => {
    // window.removeEventListener("click", next);
    window.removeEventListener("keydown", escapeZen);
    delete document.body.dataset.zen;
  });
  return <div class="hosting-question">
    <DisplayQuiz
      question={question}
      countdown={ctrl.countdown >= 0 ? <>{Math.floor(ctrl.countdown / 1000)}</> : null}
      details={ctrl.state.name === QuizState.ALTERNATIVE ? <>{ctrl.getNumberOfAnswered()}/{ctrl.room.participants.length}</> : undefined}
      correct={question.correct}
      statistics={question.statistics}
    />
    <button class="continue-quiz" onClick={next}>
      Continue
    </button>
    <ParticipantList limit={5}
      getParticipants={() => ctrl.getParticipants()}
      getCurrentStandings={() => ctrl.getCurrentStandings()}
    />
  </div>
}

function DisplayFinalResults({ctrl, results}) {
  return <>
    <h3>And the results are....</h3>
    <ParticipantList
      getParticipants={() => ctrl.getParticipants()}
      getCurrentStandings={() => ctrl.getCurrentStandings()}
    />
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
          {() => <DisplayFinalResults ctrl={ctrl} results={ctrl.getCurrentStandings()}/>}
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