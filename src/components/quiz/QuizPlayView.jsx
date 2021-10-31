import './quiz.css';

export function QuizPlayView(){
  return <article class="quiz quiz-play">
    <section class="quiz-question">
      <h3>
                QUESTION
      </h3>
    </section>
    <section class="quiz-body">
      <div class="quiz-timer">30s...</div>
      <figure>
        <img src="" alt=""/>
      </figure>
      <div class="quiz-answered">n/N</div>
    </section>
    <section class="quiz-alternatives">
      <button class="quiz-alternative">
                A
      </button>
      <button class="quiz-alternative">
                B
      </button>
      <button class="quiz-alternative">
                C
      </button>
      <button class="quiz-alternative">
                D
      </button>
    </section>
  </article>;
}
