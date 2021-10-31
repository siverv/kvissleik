import { QuizHostView } from "../components/quiz/QuizHostView";


export function HostView(){
  return <div>
    <form>
      <fieldset>
        <legend>
          Quiz settings
        </legend>
        <label>
          Select quiz
          <select name="quiz">
            <option value="DEFAULT">
              The single saved quiz
            </option>
          </select>
        </label>
        <label>
          Max number of players
          <input type="number" name="maxNumberOfPlayers"/>
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
        Host!
      </button>
    </form>
    <QuizHostView/>
  </div>;
}
