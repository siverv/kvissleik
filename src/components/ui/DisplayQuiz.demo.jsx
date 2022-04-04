import {createNewQuestion, createDefaultQuiz} from '../../service/makeService';
import {DisplayQuiz} from './DisplayQuiz';
import "../../style/views.css";

export const label = "Display quiz demo";
export const slug = "display-quiz";


export const examples = [
  function BasicDisplayQuiz(){
    const question = createNewQuestion();
    return <DisplayQuiz
      question={question}
    />;
  },
  function DisplayQuizWithImage(){
    const question = createDefaultQuiz().questions[0];
    return <DisplayQuiz
      question={question}
    />;
  },
  function DisplayQuizWithAnswer(){
    const question = createNewQuestion();
    return <DisplayQuiz
      question={question}
      getAnswer={() => question.alternatives[0].id}
    />;
  },
  function DisplayQuizWithValidation(){
    const question = createNewQuestion();
    return <DisplayQuiz
      question={question}
      correct={question.alternatives[0].id}
    />;
  },
  function DisplayQuizWithCorrectAnswer(){
    const question = createNewQuestion();
    return <DisplayQuiz
      question={question}
      getAnswer={() => question.alternatives[0].id}
      correct={question.alternatives[0].id}
    />;
  },
  function DisplayQuizWithIncorrectAnswer(){
    const question = createNewQuestion();
    return <DisplayQuiz
      question={question}
      getAnswer={() => question.alternatives[0].id}
      correct={question.alternatives[1].id}
    />;
  },
  function DisplayQuizWithIncorrectAnswerAndStatistics(){
    const question = createNewQuestion();
    return <DisplayQuiz
      question={question}
      getAnswer={() => question.alternatives[0].id}
      correct={question.alternatives[1].id}
      statistics={ new Map()
        .set(question.alternatives[0].id, 5)
        .set(question.alternatives[1].id, 2)
        .set(question.alternatives[2].id, 7)
        .set(question.alternatives[3].id, 0)
      }
    />;
  },
  function DisplayQuizWithValidationAndStatisticsWithDiverseAnswers(){
    const question = createNewQuestion();
    return <DisplayQuiz
      question={question}
      correct={question.alternatives[1].id}
      statistics={ new Map()
        .set(question.alternatives[0].id, 5)
        .set(question.alternatives[1].id, 2)
        .set(question.alternatives[2].id, 7)
        .set(question.alternatives[3].id, 0)
      }
    />;
  },
  function DisplayQuizWithValidationAndStatisticsWithOneAnswer(){
    const question = createNewQuestion();
    return <DisplayQuiz
      question={question}
      correct={question.alternatives[1].id}
      statistics={ new Map()
        .set(question.alternatives[0].id, 1)
        .set(question.alternatives[1].id, 0)
        .set(question.alternatives[2].id, 0)
        .set(question.alternatives[3].id, 0)
      }
    />;
  },
  function DisplayQuizWithValidationAndStatisticsWithNoAnswers(){
    const question = createNewQuestion();
    return <DisplayQuiz
      question={question}
      correct={question.alternatives[1].id}
      statistics={ new Map()
        .set(question.alternatives[0].id, 0)
        .set(question.alternatives[1].id, 0)
        .set(question.alternatives[2].id, 0)
        .set(question.alternatives[3].id, 0)
      }
    />;
  },
  function DisplayQuizWithValidationAndStatisticsWithExtremeDifference(){
    const question = createNewQuestion();
    return <DisplayQuiz
      question={question}
      correct={question.alternatives[1].id}
      statistics={ new Map()
        .set(question.alternatives[0].id, 5)
        .set(question.alternatives[1].id, 2)
        .set(question.alternatives[2].id, 7)
        .set(question.alternatives[3].id, 60000)
      }
    />;
  },
  function DisplayQuizWithIncorrectAnswerStatisticsAndScore(){
    const question = createNewQuestion();
    return <DisplayQuiz
      question={question}
      getAnswer={() => question.alternatives[0].id}
      correct={question.alternatives[1].id}
      statistics={ new Map()
        .set(question.alternatives[0].id, 5)
        .set(question.alternatives[1].id, 2)
        .set(question.alternatives[2].id, 7)
        .set(question.alternatives[3].id, 0)
      }
      getScore={() => ({
        total: 12345,
        added: 0,
        position: 2
      })}
    />;
  },
  function DisplayQuizWithCorrectAnswerStatisticsAndScore(){
    const question = createNewQuestion();
    return <DisplayQuiz
      question={question}
      getAnswer={() => question.alternatives[1].id}
      correct={question.alternatives[1].id}
      statistics={ new Map()
        .set(question.alternatives[0].id, 5)
        .set(question.alternatives[1].id, 2)
        .set(question.alternatives[2].id, 7)
        .set(question.alternatives[3].id, 0)
      }
      getScore={() => ({
        total: 12345,
        added: 678,
        position: 2
      })}
    />;
  },
  function DisplayQuizWithCorrectAnswerStatisticsAndScoreWithExtremeDifference(){
    const question = createNewQuestion();
    return <DisplayQuiz
      question={question}
      getAnswer={() => question.alternatives[1].id}
      correct={question.alternatives[1].id}
      statistics={ new Map()
        .set(question.alternatives[0].id, 5)
        .set(question.alternatives[1].id, 2)
        .set(question.alternatives[2].id, 7)
        .set(question.alternatives[3].id, 100000)
      }
      getScore={() => ({
        total: 12345,
        added: 678,
        position: 2
      })}
    />;
  }
];

