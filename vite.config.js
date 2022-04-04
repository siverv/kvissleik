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
        "background_color": "#FFFFFF",
        "description": "Quiz web-app using SolidJS and WebRTC."
      }
    }),
  ],
  define: {
    // eslint-disable-next-line no-undef
    '__APP_VERSION__': JSON.stringify(process.env.npm_package_version),
    '__APP_BUILD_TIME__': Date.now()
  },
  build: {
    target: "esnext",
    polyfillDynamicImport: false,
  }
});
