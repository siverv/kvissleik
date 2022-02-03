import { render } from "solid-js/web";
import { registerSW } from 'virtual:pwa-register';

import "./style/main.css";
import "./style/fira-sans.css";
import {App} from "./App";

render(App, document.getElementById("root"));

const _updateSW = registerSW({
  onNeedRefresh() {
    // show a prompt to user
  },
  onOfflineReady() {
    // show a ready to work offline to user
  },
});
