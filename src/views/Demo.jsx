import {createNewQuestion} from '../service/makeService';
import {DisplayQuiz} from '../components/ui/DisplayQuiz';
import "./View.css";
import './Play.css';

export function DemoView(){
  const question = createNewQuestion();
  let statistics = new Map()
    .set(question.alternatives[0].id, 5)
    .set(question.alternatives[1].id, 2)
    .set(question.alternatives[2].id, 7)
    .set(question.alternatives[3].id, 0);
  return <div class="view play-view">
    <DisplayQuiz
      question={question}
    />
    <hr/>
    <DisplayQuiz
      question={question}
      getAnswer={() => question.alternatives[0].id}
    />
    <hr/>
    <DisplayQuiz
      question={question}
      correct={question.alternatives[0].id}
    />
    <hr/>
    <DisplayQuiz
      question={question}
      getAnswer={() => question.alternatives[0].id}
      correct={question.alternatives[0].id}
    />
    <hr/>
    <DisplayQuiz
      question={question}
      getAnswer={() => question.alternatives[0].id}
      correct={question.alternatives[1].id}
    />
    <hr/>
    <DisplayQuiz
      question={question}
      getAnswer={() => question.alternatives[0].id}
      correct={question.alternatives[1].id}
      statistics={ new Map()
        .set(question.alternatives[0].id, 5)
        .set(question.alternatives[1].id, 2)
        .set(question.alternatives[2].id, 7)
        .set(question.alternatives[3].id, 0)
      }
    />
    <hr/>
    <DisplayQuiz
      question={question}
      correct={question.alternatives[1].id}
      statistics={ new Map()
        .set(question.alternatives[0].id, 5)
        .set(question.alternatives[1].id, 2)
        .set(question.alternatives[2].id, 7)
        .set(question.alternatives[3].id, 0)
      }
    />
    <hr/>
    <DisplayQuiz
      question={question}
      correct={question.alternatives[1].id}
      statistics={ new Map()
        .set(question.alternatives[0].id, 1)
        .set(question.alternatives[1].id, 0)
        .set(question.alternatives[2].id, 0)
        .set(question.alternatives[3].id, 0)
      }
    />
    <hr/>
    <DisplayQuiz
      question={question}
      correct={question.alternatives[1].id}
      statistics={ new Map()
        .set(question.alternatives[0].id, 0)
        .set(question.alternatives[1].id, 0)
        .set(question.alternatives[2].id, 0)
        .set(question.alternatives[3].id, 0)
      }
    />
    <hr/>
    <DisplayQuiz
      question={question}
      correct={question.alternatives[1].id}
      statistics={ new Map()
        .set(question.alternatives[0].id, 5)
        .set(question.alternatives[1].id, 2)
        .set(question.alternatives[2].id, 7)
        .set(question.alternatives[3].id, 60000)
      }
    />
    <hr/>
    <DisplayQuiz
      question={question}
      getAnswer={() => question.alternatives[0].id}
      correct={question.alternatives[1].id}
      statistics={ new Map()
        .set(question.alternatives[0].id, 5)
        .set(question.alternatives[1].id, 2)
        .set(question.alternatives[2].id, 7)
        .set(question.alternatives[3].id, 0)
      }
      score={{
        total: 12345,
        added: 0,
        position: 2
      }}
    />
    <hr/>
    <DisplayQuiz
      question={question}
      getAnswer={() => question.alternatives[1].id}
      correct={question.alternatives[1].id}
      statistics={ new Map()
        .set(question.alternatives[0].id, 5)
        .set(question.alternatives[1].id, 2)
        .set(question.alternatives[2].id, 7)
        .set(question.alternatives[3].id, 0)
      }
      score={{
        total: 12345,
        added: 678,
        position: 2
      }}
    />
    <hr/>
    <DisplayQuiz
      question={question}
      getAnswer={() => question.alternatives[1].id}
      correct={question.alternatives[1].id}
      statistics={ new Map()
        .set(question.alternatives[0].id, 5)
        .set(question.alternatives[1].id, 2)
        .set(question.alternatives[2].id, 7)
        .set(question.alternatives[3].id, 100000)
      }
      score={{
        total: 12345,
        added: 678,
        position: 2
      }}
    />
  </div>;
}
