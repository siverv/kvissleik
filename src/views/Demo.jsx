import { Routes, Route, NavLink } from "solid-app-router";
import "./Demo.css";


const demos = import.meta.globEager('../components/**/*.demo.jsx');

export function DisplayDemo({demo}){
  return <article class="demo">
    <For each={demo.examples}>
      {example => {
        return <section class="example">
          {<h3 id={example.name}>{example.name}</h3>}
          <Dynamic component={example}/>
        </section>
      }}
    </For>
  </article>
}

export function Demo(){
  return <div class="view demo-view">
    <details open>
      <summary>
        List of demos
      </summary>
      <ul class="demo-list">
        <For each={Object.values(demos)}>        
          {demo =>
            <li>
              <NavLink href={`/demo/${demo.slug}`}>
                {demo.label}
              </NavLink>
              <details>
                <summary>Examples</summary>
                <ul class="example-list">
                  <For each={demo.examples}>
                    {example => {
                      return <li>
                        <NavLink href={`/demo/${demo.slug}#${example.name}`}>
                          {example.name}
                        </NavLink>
                      </li>
                    }}
                  </For>
                </ul>
              </details>
            </li>
          }
        </For>
      </ul>
    </details>
    <Routes>
      {Object.values(demos).map(demo => <Route path={`/${demo.slug}`} element={<Dynamic component={DisplayDemo} demo={demo}/>}/>)}
    </Routes>
  </div>
}

export default Demo