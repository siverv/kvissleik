/* eslint-disable jsx-a11y/heading-has-content */
import { sanitizeHTML } from "../../utils/textUtils";
import "./DisplayQuiz.css";
import { createMemo } from "solid-js";

export function DisplayQuiz({question, getAnswer, correct, countdown, details, statistics, getScore, QuestionText, QuestionImage, Alternative}){
  QuestionText = QuestionText ?? ((props) => <h3 {...props}/>);
  QuestionImage = QuestionImage ?? (({image}) =>
    <Show when={image} fallback={<div/>}>
      <figure class="quiz-figure">
        <img src={image} alt=""/>
      </figure>
    </Show>
  );
  Alternative = Alternative ?? (({index: _, ...props}) => <div
    //data-answer={typeof props["data-answer"] === "function" ? props["data-answer"]() : props["data-answer"]}
    data-correct={typeof props["data-correct"] === "function" ? props["data-correct"]() : props["data-correct"]}
    {...props}
  />);
  let total = Array.from(statistics?.values()||[]).reduce((a,b) => a+b,0);
  return <article class="quiz"
    data-answered={createMemo(() => getAnswer?.() ? "yes" : undefined)()}
    data-validated={typeof correct === "function" ? correct() : correct}
    data-statistics={statistics ? "yes" : undefined}
    data-scored={createMemo(() => getScore && getScore() ? "yes" : undefined)()}
    style={createMemo(() => []
      .concat(statistics ? `--stats-total: ${total}` : [])
      .concat(getScore && getScore() ? `--score-total: ${getScore().total}; --score-added: ${getScore().added}; --score-position: ${getScore().position}` : [])
      .join("; "))()}
  >
    <section class="quiz-question">
      <QuestionText innerHTML={sanitizeHTML(question.text)}/>
    </section>
    <section class="quiz-body">
      <div class="quiz-timer">
        {countdown}
      </div>
      <QuestionImage image={question.image}/>
      <div class="quiz-stats">
        {details}
      </div>
    </section>
    <Show when={question.alternatives}>
      <section class="quiz-alternatives">
        <For each={question.alternatives}>
          {(alt, index) => {
            let stats = statistics?.get(alt.id);
            return <Alternative
              class="quiz-alternative"
              index={index}
              data-answer={getAnswer?.() == alt.id ? "yes" : undefined}
              data-correct={createMemo(() => (typeof correct === "function" ? correct() : correct) == alt.id ? "yes" : undefined)}
              data-stats={stats !== undefined ? stats : undefined}
              style={stats !== undefined ? "--stats:"+stats : undefined}
            >
              <div class="inner" innerHTML={sanitizeHTML(alt.text)}/>
            </Alternative>;
          }
          }
        </For>
      </section>
    </Show>
    <Show when={createMemo(() => getScore && getScore())()}>
      <section class="quiz-score">
        With a total of <b>{getScore().total}</b> points, you are <b>#{getScore().position}</b>.
      </section>
    </Show>
  </article>;
}