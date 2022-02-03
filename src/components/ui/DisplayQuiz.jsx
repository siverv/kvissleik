/* eslint-disable jsx-a11y/heading-has-content */
import { sanitizeInlineHTML } from "./TextInput";
import "./DisplayQuiz.css";

export function DisplayQuiz({question, getAnswer, correct, countdown, details, QuestionText, QuestionImage, Alternative}){
  QuestionText = QuestionText ?? ((props) => <h3 {...props}/>);
  QuestionImage = QuestionImage ?? (({image, alt}) =>
    <Show when={question.image} fallback={<div/>}>
      <figure>
        <img src={image} alt={alt}/>
      </figure>
    </Show>
  );
  Alternative = Alternative ?? ((props) => <div {...props}/>);
  return <article class="quiz" data-answered={getAnswer?.() ? "yes" : undefined} data-validated={correct}>
    <section class="quiz-question">
      <QuestionText innerHTML={sanitizeInlineHTML(question.text)}/>
    </section>
    <section class="quiz-body">
      <div class="quiz-timer">
        {countdown}
      </div>
      <QuestionImage image={question.image} alt={question.text}/>
      <div class="quiz-stats">
        {details}
      </div>
    </section>
    <Show when={question.alternatives}>
      <section class="quiz-alternatives">
        <For each={question.alternatives}>
          {alt => {
            return <Alternative
              class="quiz-alternative"
              data-id={alt.id}
              data-answer={getAnswer?.() == alt.id ? "yes" : undefined}
              data-correct={correct == alt.id ? "yes" : undefined}
            >
              <div class="inner" innerHTML={sanitizeInlineHTML(alt.text)}/>
            </Alternative>;
          }
          }
        </For>
      </section>
    </Show>
  </article>;
}