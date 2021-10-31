import { QuizPlayView } from "../components/quiz/QuizPlayView";


export function PlayView(){
  const onSubmit = (ev) => {
    ev.preventDefault();
  };
  return <div>
    <form onSubmit={onSubmit}>
      <fieldset>
        <legend>
          User details
        </legend>
        <label>
          Hello my name is...
          <input type="text" name="name" placeholder="Nickname"/>
        </label>
        <label>
          Game Code
          <input type="text" name="code" placeholder="ABCD"/>
        </label>
      </fieldset>
      <fieldset>
        <legend>
          Host settings
        </legend>
        <label>
          Use password?
          <input type="checkbox" name="include-password"/>
        </label>
        <label>
          Password
          <input type="password" name="password"/>
        </label>
        <label>
          STUN
          <input type="text" name="stun"/>
        </label>
        <label>
          TURN
          <input type="text" name="turn"/>
        </label>
      </fieldset>
      <button type="submit">
        PLAY!
      </button>
    </form>
    <QuizPlayView/>
  </div>;
}
