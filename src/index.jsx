import { render } from "solid-js/web";
import { registerSW } from 'virtual:pwa-register';
import { updateReadySignal } from "./utils/swUtils";
import { Router } from "solid-app-router";

import "./style/main.css";
import "./style/fira-sans.css";
import {App} from "./App";

render(
  () => (
    <Router>
      <App />
    </Router>
  ), 
  document.getElementById("root"));

const _updateSW = registerSW({
  onNeedRefresh() {
    updateReadySignal[1]({apply: _updateSW});
  },
  onOfflineReady() {
    // show a ready to work offline to user
  },
});
