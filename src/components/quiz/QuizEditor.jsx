import { batch, createSignal, createMemo } from "solid-js";
import { createStore, produce, unwrap } from "solid-js/store";
import { createNewQuestion } from "../../service/makeService";
import { sanitizePlaintext } from '../../utils/textUtils';
import { RichtextInput, PlaintextInput } from '../ui/TextInput';
import { DisplayQuiz } from '../ui/DisplayQuiz';
import "./QuizEditor.css";

function QuestionThumbnail({question}){
  return <div class="question-thumbnail">
    {/*eslint-disable-next-line jsx-a11y/heading-has-content*/}
    <h3 innerText={sanitizePlaintext(question.text)}/>
  </div>;
}


export function QuizEditor({quiz: originalQuiz, saveQuiz, goBack}){
  const [store, trueSetStore] = createStore({
    quiz: originalQuiz,
    currentIndex: 0,
    get currentQuestion () {
      return this.quiz.questions[this.currentIndex];
    }
  });
  const [saved, setSaved] = createSignal(true);
  const setStore = (...args) => {
    if(saved() && args[0] === "quiz"){
      batch(() => {
        setSaved(false);
        return trueSetStore(...args);
      });
    } else {
      return trueSetStore(...args);
    }
  };
  const addQuestion = (question) => {
    setStore(produce((store) => {
      store.quiz.questions.push(question);
      store.currentIndex = store.quiz.questions.length - 1;
    }));
  };
  const newQuestion = () => {
    addQuestion(createNewQuestion());
  };
  const save = () => {
    saveQuiz(unwrap(store).quiz);
    setSaved(true);
  };
  return <section class="quiz-editor">
    <button onClick={() => {
      if(!saved()){
        let ok = confirm("Are you sure you want to go back with unsaved changes?");
        if(!ok){
          return;
        }
      }
      goBack();
    }}>back</button>
    <header class="editor-toolbar">
      <h3>
        <PlaintextInput class="quiz-name" getValue={() => store.quiz.name} setValue={(name) => setStore("quiz", "name", name)}/>
      </h3>
      <button disabled={saved()} onClick={save}>save</button>
    </header>
    <aside class="question-overview">
      <ol class="question-list">
        <For each={store.quiz.questions}>
          {(question, index) => {
            return <button class="select-question" data-current={store.currentIndex == index() ? "yes" : null} onClick={() => setStore("currentIndex", index)}>
              <li class="page-thumbnail">
                <QuestionThumbnail question={question}/>
              </li>
            </button>;
          }}
        </For>
      </ol>
      <button class="new-question" onClick={() => newQuestion()}>
        Add question
      </button>
    </aside>
    <section class="question-editor">
      <Show when={store.currentQuestion}>
        <QuestionEditor getQuestion={createMemo(() => store.currentQuestion)} updateValue={(value, ...fields) => setStore("quiz", "questions", store.currentIndex, ...fields, value)}/>
      </Show>
    </section>
    {/* <aside class="quiz-properties">
      settings and adjustments
    </aside> */}
  </section>;
}

export function QuestionEditor({getQuestion, updateValue}){
  const selectImage = (ev) => {
    if(ev.target.files.length === 1) {
      let canvas = document.createElement("canvas");
      let ctx = canvas.getContext("2d");
      let img = new Image();
      img.addEventListener('load', function() {
        let imgRatio = img.width / img.height;
        canvas.width = Math.min(400 * imgRatio, img.width, 400);
        canvas.height = canvas.width / imgRatio;
        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
        updateValue(canvas.toDataURL("image/webp"), "image");
        ev.target.value = null;
      }, false);
      img.src = URL.createObjectURL(ev.target.files[0]);
      // const reader = new FileReader();
      // reader.onload = () => {
      //   updateValue(reader.result, "image");
      //   ev.target.value = null;
      // };
      // reader.readAsDataURL(ev.target.files[0]);
    }
  };
  return <DisplayQuiz
    question={getQuestion()}
    QuestionText={() => {
      return <h3>
        <RichtextInput getValue={() => getQuestion().text} setValue={(text) => updateValue(text, "text")}/>
      </h3>;
    }}
    QuestionImage={() => {
      return <figure class="quiz-figure">
        <label>
          <img src={getQuestion().image} alt="" title={getQuestion().image ? "Click to select a different image" : ""}/>
          <input onInput={selectImage} type="file" id="imgPicker" accept="image/*"/>
        </label>
      </figure>;
    }}
    Alternative={({index,...props}) => {
      let alt = createMemo(() => getQuestion().alternatives[index()]);
      return <div {...props}>
        <RichtextInput class="inner"
          getValue={() => getQuestion().alternatives[index()].text}
          setValue={(text) => updateValue(text, "alternatives", index(), "text")}
        />
        <input
          type="checkbox"
          name="correct"
          value={alt().id}
          onChange={(ev) => ev.target.checked && updateValue(ev.target.value, "correct")}
          checked={getQuestion().correct === alt().id ? "yes": false}
        />
      </div>;
    }}
  />;
}
