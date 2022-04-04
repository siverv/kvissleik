import { DisplayQuiz } from '../ui/DisplayQuiz';
import {createNewQuestion} from '../../service/makeService';
import {ParticipantList} from '../ui/ParticipantList';
import {MockParticipant} from '../ui/ParticipantList.demo';
import "./Hosting.css";

export const label = "Hosting";
export const slug = "hosting";
export const examples = [
  function HostingQuestion(){
    const question = createNewQuestion();
    const next = () => {};
    let participants = Array.from({length: 4}).map((_, i) => new MockParticipant(i, "Participant " + i, ["CONNECTED", "CONNECTING", "CLOSED"][i % 3]));
    let standings = Array.from({length: 4}).map((_, i) => ({participantId: i, position: i + 1, score: 1000 + 100 - i}));
    return <div class="hosting-quiz">
      <div class="hosting-question">
        <DisplayQuiz
          question={question}
          countdown={"12s"}
          details={<>1 / 4</>}
          correct={question.alternatives[1].id}
          statistics={ new Map()
            .set(question.alternatives[0].id, 5)
            .set(question.alternatives[1].id, 2)
            .set(question.alternatives[2].id, 7)
            .set(question.alternatives[3].id, 0)
          }
        />
        <button class="continue-quiz" onClick={next}>
          Continue
        </button>
        <ParticipantList limit={5}
          getParticipants={() => participants}
          getCurrentStandings={() => standings}
        />
      </div>
    </div>;
  }
];