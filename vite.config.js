import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    solidPlugin(),
    VitePWA({
      manifest: {
        "name": "Kvissleik",
        "short_name": "Kvissleik",
        "display": "standalone",
        "background_color": "#22334A",
        "description": "Quiz web-app using Solid Pods and WebRTC"
      }
    })
  ],
  build: {
    target: "esnext",
    polyfillDynamicImport: false,
  }
});
