import "../style/views.css";

export function About(){
  return <div class="view">
    <section class="section">
      <h3 class="section-header">
        A p2p single-host multi-client quiz-application
      </h3>
      <ul>
        <li>Reactive web framework through <a href="https://www.solidjs.com/">SolidJS</a></li>
        <li>WebRTC through <a href="https://github.com/feross/simple-peer">SimplePeer</a></li>
        <li>WebSocket through Node.js with <a href="https://github.com/websockets/ws">WS</a></li>
        <li>Build and PWA with <a href="https://github.com/vitejs/vite">Vite</a></li>
        <li>Linted with <a href="https://eslint.org/">ESLint</a></li>
        <li>Programmed mostly with <a href="https://www.sublimetext.com/">Sublime Text</a></li>
        <li>On an <a href="https://xfce.org/">XFCE</a>-based Linux-distro</li>
        <li>Hosted on <a href="https://www.hetzner.com/">Hetzner</a> (and thus wholly within EU, wrt. <a href="https://noyb.eu/en">Schrems II</a>)</li>
        <li>Analytics using <a href="https://goaccess.io/">GoAccess</a> on <a href="https://www.nginx.com/">nginx</a>-logs</li>
        <li>TLS/SSL certificates through <a href="https://letsencrypt.org/">Let's Encrypt</a></li>
        <li>Font is <a href="https://mozilla.github.io/Fira/">Fira Sans</a> by Mozilla</li>
        <li><a href="https://git.kvissleik.no">Source-code</a> rendered with <a href="https://codemadness.org/stagit.html">stagit</a></li>
        <li>Inspired by the wonderful <a href="https://www.jackboxgames.com/">Jackbox</a> games</li>
        <li>Developed by <a href="https://github.com/siverv/">siverv</a></li>
      </ul>
    </section>
    <section class="section">
      <h3 class="section-header">
        Longevity
      </h3>
      <p>
        The app is intended to remain available and free (foss/libre/adless) for the forseeable future and beyond, but the exact license is yet to be decided.
      </p>
      <p>
        Estimated costs are somewhere around $20/year for the domain and $5/month for the hosting unless the traffic changes significantly, for a total of about $80/year. If/once Kvissleik reaches a proper 1.0.0 release, a small donation box is going to be added here in order to cover some of the costs. If/once the project funds start going positive, then the profit will be divided into three parts: one part future hosting, one part donations for dependencies, and one part for the developer.
      </p>
    </section>
    <section class="section">
      <details>
        <summary>
          <b class="section-header">
            Roadmap
          </b>
        </summary>
        <pre>{`
Infrastructure:
- [x] Host as a side-along application on existing server
- [x] Manually host on dedicated server, as kvissleik.no
- 0.0.1
- [ ] Automatically deploy to any new ubuntu server
- 0.1.0
- [ ] Single Docker-container for easier self-hosting
- 1.0.0

Signalling:
- [x] Basic WebSocket signalling server (Samspill)
- 0.0.1
- [ ] Copy-paste based signalling
- [ ] Public-key based rooms through Samspill
- 0.1.0
- [ ] Public append-only log using a Solid Pod
- [ ] Rewrite the WebSocket server to interact as a public append-only log.
- [ ] Standardize into a plugin-system for custom signalling frameworks
- 1.0.0
- [ ] Online office suites like Google Sheets, Office 365, etc?
- [ ] Bluetooth?
- [ ] Audio-based transmission?

UI/UX:
- [x] Establish Kvissleik's style.
- [x] Validation look
- 0.0.1
- [ ] Host experience
- [ ] Participant experience
- [ ] Mobile experience
- [ ] Quiz-creation experience
- [ ] a11y
- [ ] i18n
- 0.1.0
- [ ] Animations
- [ ] Audio
- 1.0.0

Creation:
- [x] Create a basic quiz stored in browser
- [x] Handle multiple quizzes stored in browser
- [x] Pasting to create new quizzes
- 0.0.1
- [ ] Import/export quizzes and quiz-collections from files
- 0.1.0
- [ ] Import/export quizzes and quiz-collections from Solid Pods
- [ ] Standardize into a plugin-system for import/export
- 1.0.0
- [ ] Online drive services like Google Drive, OneDrive, etc?
- [ ] Pastebins?

Quizzes:
- [x] Basic multiple-choice playstyle
- 0.0.1
- [ ] Configuration, incl. countdown-length and custom number of alternatives.
- [ ] More than one correct answer
- 0.1.0
- [ ] Longform questions with textual answers and semi-manual validation
- [ ] Opinion polls
- [ ] Standardize into a plugin-system for custom questions.
- 1.0.0
- [ ] Discussion tool
- [ ] Word-games

Sharing:
- [-] Host games using files and/or copy-pasting quiz-json
      (-) Solved by json-import
- 0.1.0
- [ ] Find a way to effectively create/index/browse distributed/federated quiz-collections
- [ ] Password protect quizzes and quiz-collections
- 1.0.0

P2P:
- [x] Basic WebRTC-setup
- 0.0.1
- [ ] Inform on host- or participant disconnects
- 0.1.0
- [ ] Recover participant disconnects
- [ ] Recover host disconnects
- 1.0.0
- [ ] LAN and ad-hoc network support.

Optimization:
- [x] MVP
- [x] Load only latin web-fonts unless otherwise needed
- 0.0.1
- [ ] Preserve rooms on signalling-frameworks only as long as needed.
- 0.1.0
- [ ] Load only the resources in use.
- 1.0.0
- [ ] Optimize message formats

Refactoring: 
- [x] Parameterize production-values.
- 0.0.1
- [ ] A better path-based router instead of ad-hoc tabs.
- 0.1.0
- [∞] Minimize tech-debt
- [∞] Update packages
- [∞] Remove bugs

Security:
- [x] Ensure no logging outside of errors, and minimize information there.
- 0.0.1
- [ ] Password-protect rooms
- [ ] Public key crypto when signalling.
- [ ] Config for custom stun/turn servers
- 0.1.0
- [ ] Protect against enumeration of rooms
- [ ] Protect against (D)DOS
- 1.0.0
- [ ] Audit

Longevity:
- [x] Prepare README-files
- [x] Publish source code
- [x] PWA update system 
- 0.0.1
- [ ] Document source code
- [ ] Document self-hosting
- [ ] Decide LICENCE-files
- [ ] Integration tests
- 0.1.0
- [ ] Versioning of quiz-formats with conversion support.
- [ ] Versioning of clients and servers to ensure proper everything is as it should be
- [ ] Dev- and staging-environments
- [ ] Regression tests
- [ ] Unit tests
- 1.0.0
- [ ] Donations to ensure server-costs are handled
- [ ] If/once the server-costs goes positive, start giving some back to packages in use.
- [ ] Non-Profit Foundation to ensure it survives this author.   

Moonshots:
- [ ] Hosting from Godot-based games
- [ ] Taler-based marketplace of quizzes.
        `}</pre>
      </details>
    </section>
    <section class="section">
      <h3 class="section-header">
        Contact
      </h3>
      <p>
        The developer can be reached on <a href="mailto:replace_me_with_anything.contact-at-kvissleik.no@siverv.no">replace_me_with_anything.contact-at-kvissleik.no@siverv.no</a>
      </p>
    </section>
  </div>;
}
