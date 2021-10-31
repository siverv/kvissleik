import { RichtextInput } from '../ui/TextInput';
import './quiz.css';

export function QuizEditView({quizTaskSignal: [quizTask, setQuizTask]}){
  const handleChangeTextField = (fieldName) => (value) => {
    setQuizTask({
      ...quizTask(),
      [fieldName]: value
    });
  };
  return <article class="quiz quiz-host">
    <section class="quiz-question">
      <h3>
        <RichtextInput signal={[()=>quizTask().question, handleChangeTextField("question")]}/>
      </h3>
    </section>
    <section class="quiz-body">
      <div class="quiz-timer">30s...</div>
      <figure class="quiz-figure">
        <button>
          select image
        </button>
        <img src="" alt=""/>
      </figure>
      <div class="quiz-answered">n/N</div>
    </section>
    <section class="quiz-alternatives">
      <div class="quiz-alternative">
        <RichtextInput signal={[
          () => quizTask().alternativeA,
          handleChangeTextField("alternativeA")
        ]}/>
      </div>
      <div class="quiz-alternative">
        <RichtextInput signal={[
          () => quizTask().alternativeB,
          handleChangeTextField("alternativeB")
        ]}/>
      </div>
      <div class="quiz-alternative">
        <RichtextInput signal={[
          () => quizTask().alternativeC,
          handleChangeTextField("alternativeC")
        ]}/>
      </div>
      <div class="quiz-alternative">
        <RichtextInput signal={[
          () => quizTask().alternativeD,
          handleChangeTextField("alternativeD")
        ]}/>
      </div>
    </section>
  </article>;
}
