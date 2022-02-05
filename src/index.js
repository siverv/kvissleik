import { render } from "solid-js/web";
import { registerSW } from 'virtual:pwa-register';
import { magicObject } from "./utils/swUtils";

import "./style/main.css";
import "./style/fira-sans.css";
import {App} from "./App";

render(App, document.getElementById("root"));

const _updateSW = registerSW({
  onNeedRefresh() {
    magicObject.applyUpdate = () => {
      _updateSW(true);
      magicObject.setUpdateReady(false);
    };
    magicObject.setUpdateReady(true);
  },
  onOfflineReady() {
    // show a ready to work offline to user
  },
});
