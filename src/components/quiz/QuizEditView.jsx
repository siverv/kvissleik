import { DisplayQuiz } from '../ui/DisplayQuiz';
import { RichtextInput } from '../ui/TextInput';
import '../ui/DisplayQuiz.css';
import './QuizEditView.css';

export function QuizEditView({quizTaskSignal: [quizTask, setQuizTask]}){
  const handleChangeTextField = (fieldName) => (value) => {
    setQuizTask({
      ...quizTask(),
      [fieldName]: value
    });
  };
  return <DisplayQuiz
    question={{text: "", image: null, alternatives: [{id: "A", text: ""}, {id: "B", text: ""}, {id: "C", text: ""}, {id: "D", text: ""}]}}
    QuestionText={() => {
      return <h3>
        <RichtextInput signal={[()=>quizTask().question, handleChangeTextField("question")]}/>
      </h3>;
    }}
    QuestionImage={() => {
      return <figure class="quiz-figure">
        <button>
          select image
        </button>
        <img src="" alt=""/>
      </figure>;
    }}
    Alternative={(props) => {
      const letter = props["data-id"];
      const altName = "alternative" + letter;
      return <div {...props}>
        <RichtextInput class="inner" signal={[
          () => quizTask()[altName],
          handleChangeTextField(altName)
        ]}/>
        <input type="checkbox" name="correct" value={letter} onChange={(ev) => ev.target.checked && handleChangeTextField("correct")(ev.target.value)} checked={quizTask().correct === letter ? "yes": false}/>
      </div>;
    }}
  />;
//   return <article class="quiz quiz-edit">
//     <section class="quiz-question">
//     </section>
//     <section class="quiz-body">
//       <div class="quiz-timer">30s...</div>
//       <figure class="quiz-figure">
//         <button>
//           select image
//         </button>
//         <img src="" alt=""/>
//       </figure>
//       <div class="quiz-answered">n/N</div>
//     </section>
//     <section class="quiz-alternatives">
//       <div class="quiz-alternative">
//         <RichtextInput signal={[
//           () => quizTask().alternativeA,
//           handleChangeTextField("alternativeA")
//         ]}/>
//         <input type="checkbox" name="correct" value="A" onChange={(ev) => ev.target.checked && handleChangeTextField("correct")(ev.target.value)} checked={quizTask().correct === "A" ? "yes": false}/>
//       </div>
//       <div class="quiz-alternative">
//         <RichtextInput signal={[
//           () => quizTask().alternativeB,
//           handleChangeTextField("alternativeB")
//         ]}/>
//         <input type="checkbox" name="correct" value="B"  onChange={(ev) => ev.target.checked && handleChangeTextField("correct")(ev.target.value)} checked={quizTask().correct === "B" ? "yes" : false}/>
//       </div>
//       <div class="quiz-alternative">
//         <RichtextInput signal={[
//           () => quizTask().alternativeC,
//           handleChangeTextField("alternativeC")
//         ]}/>
//         <input type="checkbox" name="correct" value="C"  onChange={(ev) => ev.target.checked && handleChangeTextField("correct")(ev.target.value)} checked={quizTask().correct === "C" ? "yes" : false}/>
//       </div>
//       <div class="quiz-alternative">
//         <RichtextInput signal={[
//           () => quizTask().alternativeD,
//           handleChangeTextField("alternativeD")
//         ]}/>
//         <input type="checkbox" name="correct" value="D"  onChange={(ev) => ev.target.checked && handleChangeTextField("correct")(ev.target.value)} checked={quizTask().correct === "D" ? "yes" : false}/>
//       </div>
//     </section>
//   </article>;
}
