import './quiz.css';

export function QuizHostView(){
  return <article class="quiz quiz-host">
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
      <div class="quiz-alternative">
                A
      </div>
      <div class="quiz-alternative">
                B
      </div>
      <div class="quiz-alternative">
                C
      </div>
      <div class="quiz-alternative">
                D
      </div>
    </section>
  </article>;
}
