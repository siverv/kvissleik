import {createMemo} from 'solid-js'
import "./ParticipantList.css";

function ConnectionState({getState}){
	return <span>
		<Switch fallback={<>[{getState()}]</>}>
			<Match when={getState() === "CONNECTED"}>
				
			</Match>
			<Match when={getState() === "CONNECTING"}>
				[...]
			</Match>
			<Match when={getState() === "CLOSED"}>
				[AWAY]
			</Match>
			<Match when={!getState()}>
			</Match>
		</Switch>
	</span>
}

export function ParticipantList({getParticipants, getCurrentStandings, actions, max, limit}) {
	const getOrderedParticipants = createMemo(() => {
		let participants = getParticipants();
		if(getCurrentStandings){
			let scoreMap = getCurrentStandings()
				.reduce((map, stand) => map.set(stand.participantId, stand), new Map());
			participants = participants.slice().sort((a,b) => scoreMap.get(a.id)?.position - scoreMap.get(b.id)?.position);
		}
		return participants;
	})
	let classNames = ["participant-list"]
		.concat(actions ? "with-actions" : [])
		.concat(getCurrentStandings ? "with-standings" : []);
  return <aside class={classNames.join(" ")}>
	  <ul>
	    <For each={getOrderedParticipants().slice(0, limit || Infinity)}>
	      {(participant) => {
	      	let standing = getCurrentStandings?.().find(stand => stand.participantId === participant.id);
	      	return <li class="participant" data-state={participant.state}>
	      		<Show when={standing}>
	      			<span class="position">
	      				#{standing.position}
      				</span>
	      		</Show>
	      		<span class="state">
		        	<ConnectionState getState={() => participant.state}/>
	      		</span>
	      		<span class="name">
      				{participant.name}
	      		</span>
	      		<Show when={standing}>
	      			<span class="score">
	      				{standing.score}
	      			</span>
		      		<Show when={!isNaN(standing.added)}>
		      			<span class="added">
		      				(+{standing.added})
		      			</span>
		      		</Show>
	      		</Show>
		        <Show when={actions}>
		        	<span class="actions">
		        		{actions?.(participant)}
		        	</span>
		        </Show>
		      </li>
		    }}
	    </For>
	    <Show when={max > 0 && max < 16 && getParticipants().length < max}>
		    <For each={Array.from({length: max-getParticipants().length})}>
		      {(_, index) => {
		      	let position = getParticipants().length + index() + 1;
		      	let standing = !!getCurrentStandings;
		      	return <li class="participant placeholder">
		      		<Show when={standing}>
		      			<span class="position">
	      					#{position}
	      				</span>
		      		</Show>
		      		<span class="name">
		      		</span>
		      		<Show when={standing}>
		      			<span class="score">
		      			</span>
		      		</Show>
		      		<span class="status">

		      		</span>
			        <Show when={actions}>

			        </Show>
			      </li>
			    }}
		    </For>
	    </Show>
	  </ul>
  </aside>
}

export function LobbyList({kick, ...props}){
	return <ParticipantList {...props} actions={participant => {
    return <button type="button" onClick={() => kick(participant)}>
      Kick
    </button>
	}}/>
}