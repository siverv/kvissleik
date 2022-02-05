import { TabButton, TabPanel, useTabSystem } from "./components/Tab";
import { HostView } from "./views/Host";
import { MakeView } from "./views/Make";
import { PlayView } from "./views/Play";
import { DemoView } from "./views/Demo";
import logo from './assets/header-logo.svg';
import logo2 from './assets/footer-logo.svg';
import { magicObject } from "./utils/swUtils";
import { createSignal, Match } from "solid-js";

export function App(){
  let tabSignal = useTabSystem("tab", "play");
  let [updateReady, setUpdateReady] = createSignal(null);
  magicObject.setUpdateReady = setUpdateReady;
  if(magicObject.applyUpdate){
    setTimeout(() => setUpdateReady(true), 0);
  }
  return <div class="app">
    <header class="app-header">
      <Show when={updateReady()}>
        <section>
          New version is available. <button onClick={() => magicObject.applyUpdate()}>update</button>
        </section>
      </Show>
      <div class="app-logo">
        <img src={logo} alt="" class="logo"/>
      </div>
      <h1 class="title">
        Kvissleik
      </h1>
      <nav class="app-nav">
        <TabButton tab={"play"} tabSignal={tabSignal}>
          play
        </TabButton>
        <TabButton tab={"host"} tabSignal={tabSignal}>
          host
        </TabButton>
        <TabButton tab={"make"} tabSignal={tabSignal}>
          make
        </TabButton>
        <div style="flex-grow: 1"></div>
        <TabButton tab={"config"} tabSignal={tabSignal}>
          config
        </TabButton>
      </nav>
    </header>
    <main class="app-main">
      <Switch>
        <Match when={false}>
          <DemoView/>
        </Match>
        <TabPanel tab={"play"} tabSignal={tabSignal}>
          <PlayView/>
        </TabPanel>
        <TabPanel tab={"host"} tabSignal={tabSignal}>
          <HostView/>
        </TabPanel>
        <TabPanel tab={"make"} tabSignal={tabSignal}>
          <MakeView/>
        </TabPanel>
        <TabPanel tab={"config"} tabSignal={tabSignal}>
          <>Not yet implemented</>
        </TabPanel>
      </Switch>
    </main>
    <footer class="app-footer">
      <div class="app-logo">
        <img src={logo2} alt="" class="logo"/>
      </div>
      <div>
        <a href="https://github.com/siverv/">
          siverv
        </a>
        {` | `} 
        <span>2022</span>
      </div>
    </footer>
  </div>;
}
