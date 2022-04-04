import {For} from 'solid-js';
import "./RadioGroup.css";

export function RadioGroup({name, initialValue, options, onInput}){
  return <div class="radio-group">
    <For each={options}>
      {(option) => {
        const id = `${name}__${option.value}`;
        return <>
          <input type="radio" name={name} id={id} value={option.value} checked={option.value === initialValue ? "yes" : undefined} onInput={onInput}/>
          <label title={option.description} class="radio-group-button" htmlFor={id}>
            {option.label}
          </label>
        </>;
      }}
    </For>
  </div>;
}