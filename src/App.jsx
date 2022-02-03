import { TabButton, TabPanel, useTabSystem } from "./components/Tab";
import { HostView } from "./views/Host";
import { MakeView } from "./views/Make";
import { PlayView } from "./views/Play";
import logo from './assets/header-logo.svg';
import logo2 from './assets/footer-logo.svg';

export function App(){
  let tabSignal = useTabSystem("tab", "play");
  return <div class="app">
    <header class="app-header">
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
