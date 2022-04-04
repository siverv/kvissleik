import { Show } from 'solid-js';
import { CopyToClipboardButton } from './CopyToClipboardButton';
import "./HostConnectionDetails.css";

export function HostConnectionDetails({server}) {
  return <section class="host-connection-details">
    <Show when={server.getRoomCode()}>
      {code => <h3 class="room-code-header">
          Room code is <span class="code">{code.split("").map(letter => <span>{letter}</span>)}</span>
        <CopyToClipboardButton getValue={() => code}>
          copy code
        </CopyToClipboardButton>
      </h3>
      }
    </Show>
    <Show when={server.getRoomLink()}>
      {link => <div class="invite-by-link">
        <a href={link} target="_blank">
          Invite players by link
        </a>
        <CopyToClipboardButton getValue={() => link}>
          copy link
        </CopyToClipboardButton>
      </div>}
    </Show>
  </section>;
}