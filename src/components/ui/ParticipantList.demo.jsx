
import {ParticipantList, LobbyList as _LobbyList} from './ParticipantList.jsx';

export const label = "Participant list";
export const slug = "participant-list";

const CONNECTED = "CONNECTED";
const CONNECTING = "CONNECTING";
const CLOSED = "CLOSED";

export class MockParticipant {
	constructor(id, name, state = CONNECTED){
		this.id = id;
		this.name = name;
		this.state = state;
	}
}

const mockParticipants = [
	new MockParticipant(1, "Jack"),
	new MockParticipant(2, "Jill"),
	new MockParticipant(3, "Jane"),
	new MockParticipant(4, "John"),
]

const mockStandings = [
	{participantId: 1, position: 1, score: 100},
	{participantId: 2, position: 2, score: 90},
	{participantId: 3, position: 3, score: 20},
	{participantId: 4, position: 4, score: 0},
]


export const examples = [
	function LobbyList(){
		const getParticipants = () => mockParticipants;
		return <_LobbyList
			getParticipants={getParticipants}
			kick={participant => alert("Kicked " + participant.name)}
		/>
	},
	function EmptyLobbyList(){
		const getParticipants = () => [];
		return <_LobbyList
			max={8}
			getParticipants={getParticipants}
			kick={participant => alert("Kicked " + participant.name)}
		/>
	},
	function FourParticipantsWithStandings(){
		const getParticipants = () => mockParticipants;
		const getCurrentStandings = () => mockStandings;
		return <ParticipantList getParticipants={getParticipants} getCurrentStandings={getCurrentStandings}/>
	},
	function FourParticipantsWithAMaximumOfEight(){
		const getParticipants = () => mockParticipants;
		const getCurrentStandings = () => mockStandings;
		return <ParticipantList getParticipants={getParticipants} getCurrentStandings={getCurrentStandings} max={8}/>
	},
	function FourParticipantsWithDifferentStates(){
		let participants = Array.from({length: 4}).map((_, i) => new MockParticipant(i, "Participant " + i, [CONNECTED, CONNECTING, CLOSED][i % 3]));
		let standings = Array.from({length: 4}).map((_, i) => ({participantId: i, position: i + 1, score: 1000 + 100 - i}));
		return <ParticipantList getParticipants={() => participants} getCurrentStandings={() => standings}/>
	},
	function FourParticipantsWithSomeDisconnected(){
		let participants = Array.from({length: 4}).map((_, i) => new MockParticipant(i, "Participant " + i, i % 2 === 0 ? CONNECTED : CLOSED));
		let standings = Array.from({length: 4}).map((_, i) => ({participantId: i, position: i + 1, score: 1000 + 100 - i}));
		return <ParticipantList getParticipants={() => participants} getCurrentStandings={() => standings}/>
	},
	function FourParticipantsWithSomeDisconnectedAndAddedScore(){
		let participants = Array.from({length: 4}).map((_, i) => new MockParticipant(i, "Participant " + i, i % 2 === 0 ? CONNECTED : CLOSED));
		let standings = Array.from({length: 4}).map((_, i) => ({participantId: i, position: i + 1, score: 1000 + 100 - i, added: 100 - i}));
		return <ParticipantList getParticipants={() => participants} getCurrentStandings={() => standings}/>
	},
	function ParticipantsWithAddedScore(){
		let participants = Array.from({length: 20}).map((_, i) => new MockParticipant(i, "Participant " + i));
		let standings = Array.from({length: 20}).map((_, i) => ({participantId: i, position: i + 1, score: 1000 + 100 - i, added: 100 - i}));
		return <ParticipantList getParticipants={() => participants} getCurrentStandings={() => standings}/>
	},
	function LongListOfParticipants(){
		let participants = Array.from({length: 20}).map((_, i) => new MockParticipant(i, "Participant " + i));
		let standings = Array.from({length: 20}).map((_, i) => ({participantId: i, position: i + 1, score: 100 - i}));
		return <ParticipantList getParticipants={() => participants} getCurrentStandings={() => standings}/>
	},
	function LongListOfParticipantsWithLimit(){
		let participants = Array.from({length: 20}).map((_, i) => new MockParticipant(i, "Participant " + i));
		let standings = Array.from({length: 20}).map((_, i) => ({participantId: i, position: i + 1, score: 100 - i}));
		return <ParticipantList getParticipants={() => participants} getCurrentStandings={() => standings} limit={5}/>
	},
	function LongNamesAndOrBigScores(){
		let participants = Array.from({length: 8}).map((_, i) => new MockParticipant(i, i % 2 === 0 ? "This is a such a long name that is most likely will be wrapped" : "Short name"));
		let standings = Array.from({length: 8}).map((_, i, l) => ({participantId: i, position: l.length - i, score: 100 ** (i / 2 | 0)}));
		return <ParticipantList getParticipants={() => participants} getCurrentStandings={() => standings}/>
	},
	function LongUnspacedNamesAndOrBigScores(){
		let participants = Array.from({length: 8}).map((_, i) => new MockParticipant(i, i % 2 === 0 ? "Thisisasuchalongnamethatismostlikelywillbewrapped" : "Short name"));
		let standings = Array.from({length: 8}).map((_, i, l) => ({participantId: i, position: l.length - i, score: 100 ** (i / 2 | 0)}));
		return <ParticipantList getParticipants={() => participants} getCurrentStandings={() => standings}/>
	}
]