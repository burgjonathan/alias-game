import { RoomState, TEAM_NAMES, TEAM_COLORS } from '../App'
import Board from './Board'

interface Props {
  room: RoomState
  myId: string
  amHost: boolean
  onStartRound: () => void
}

export default function GameScreen({ room, myId, amHost, onStartRound }: Props) {
  const currentTeam = room.currentTeam
  const teamPlayers = room.players.filter(p => p.team === currentTeam)
  const amOnCurrentTeam = room.players.find(p => p.id === myId)?.team === currentTeam

  return (
    <div className="screen game-screen">
      <Board positions={room.positions} />

      <div className="turn-indicator" style={{ color: TEAM_COLORS[currentTeam] }}>
        התור של {TEAM_NAMES[currentTeam]}
      </div>

      <div className="team-roster">
        {teamPlayers.map(p => (
          <span key={p.id} className={`player-tag ${p.id === myId ? 'me' : ''}`}>
            {p.name}
          </span>
        ))}
      </div>

      <p className="instructions">
        תארו את המילה בלי להשתמש בה!
        <br />
        דילוג = צעד אחורה
      </p>

      {amOnCurrentTeam ? (
        <button className="btn btn-primary btn-large" onClick={onStartRound}>
          התחילו!
        </button>
      ) : (
        <p className="status-text">ממתין ל{TEAM_NAMES[currentTeam]}...</p>
      )}
    </div>
  )
}
