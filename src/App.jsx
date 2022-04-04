import headerLogo from './assets/header-logo.svg';
import footerLogo from './assets/footer-logo.svg';
import { updateReadySignal } from "./utils/swUtils";
import { Link } from "solid-app-router";
import { AppRoutes } from './routes';

export function App(){
  const [updateReady, setUpdateReady] = updateReadySignal;
  return <div class="app">
    <header class="app-header">
      <Show when={updateReady()}>
        <section class="new-version">
          New version is available. <button onClick={() => (updateReady().apply(), setUpdateReady(null))}>update</button>
        </section>
      </Show>
      <div class="app-logo">
        <img src={headerLogo} alt="" class="logo"/>
      </div>
      <h1 class="title">
        <Link class="title-link" href="/">
          Kvissleik
        </Link>
      </h1>
      <nav class="app-nav">
        <Link class="nav-link" href="/play">
          play
        </Link>
        <Link class="nav-link" href="/host">
          host
        </Link>
        <Link class="nav-link" href="/make">
          make
        </Link>
        <div style="flex-grow: 1"></div>
        <Link class="nav-link" href="/config">
          <s>config</s>
        </Link>
        {/*<Link class="nav-link" href="/test">
          testbed
        </Link>*/}
      </nav>
    </header>
    <main class="app-main">
      <ErrorBoundary fallback={(error, reset) => {
        console.error(error);
        return <>
          <button onClick={reset}>
            oops.
          </button>
          <pre>
            {error}
          </pre>
        </>;
      }}>
        <AppRoutes/>
      </ErrorBoundary>
    </main>
    <footer class="app-footer">
      <div class="app-logo">
        <img src={footerLogo} alt="" class="logo"/>
      </div>
      <nav>
        <a href="https://github.com/siverv/">
          siverv
        </a>
        {` | `} 
        <span>2022</span>
        {` | `} 
        <span title={`Build time: ${ /* eslint-disable-line no-undef */ new Date(__APP_BUILD_TIME__).toISOString()}`}>v{__APP_VERSION__}</span>
        {` | `} 
        <Link class="nav-link" href="/about">
          about
        </Link>
        {` | `} 
        <a href="https://git.kvissleik.no">
          git
        </a>
      </nav>
    </footer>
  </div>;
}
