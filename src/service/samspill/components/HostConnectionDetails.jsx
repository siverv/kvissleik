import { Show } from 'solid-js';
import { CopyToClipboardButton } from './CopyToClipboardButton';

export function HostConnectionDetails({server}) {
  return <>
    <Show when={server.getRoomCode()}>
      {code => <h3>
          Room code is {code}
        <CopyToClipboardButton getValue={() => code}>
          copy code
        </CopyToClipboardButton>
      </h3>
      }
    </Show>
    <Show when={server.getRoomLink()}>
      {link => <div>
        <a href={link} target="_blank">
          Invite players by link
        </a>
        <CopyToClipboardButton getValue={() => link}>
          copy link
        </CopyToClipboardButton>
      </div>}
    </Show>
  </>
}