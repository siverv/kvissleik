
export function QuizThumbnail({quizTask}){
  return <div class="quiz-thumbnail">
    <h3 innerHTML={quizTask().question}>{}</h3>
  </div>;
}
