import { RoomState, TEAM_NAMES, TEAM_COLORS } from '../App'

interface Props {
  room: RoomState
  myId: string
  amHost: boolean
  myTeam: 0 | 1 | null
  error: string
  onJoinTeam: (team: 0 | 1) => void
  onStartGame: () => void
  onHome: () => void
}

export default function Lobby({ room, myId, amHost, myTeam, error, onJoinTeam, onStartGame, onHome }: Props) {
  const team0 = room.players.filter(p => p.team === 0)
  const team1 = room.players.filter(p => p.team === 1)
  const unassigned = room.players.filter(p => p.team === null)
  const canStart = team0.length >= 2 && team1.length >= 2

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}?code=${room.code}`
    : ''

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'Alias Game', text: `הצטרפו למשחק Alias! קוד: ${room.code}`, url: shareUrl })
    } else {
      await navigator.clipboard.writeText(shareUrl)
    }
  }

  return (
    <div className="screen lobby-screen">
      <h2>חדר משחק</h2>

      <div className="room-code-box">
        <span className="room-code-label">קוד חדר:</span>
        <span className="room-code">{room.code}</span>
        <button className="btn btn-small" onClick={handleShare}>שתף</button>
      </div>

      <div className="teams-container">
        <div className="team-column">
          <h3 style={{ color: TEAM_COLORS[0] }}>{TEAM_NAMES[0]}</h3>
          <div className="team-players">
            {team0.map(p => (
              <div key={p.id} className={`player-tag ${p.id === myId ? 'me' : ''}`}>
                {p.name} {p.isHost ? '👑' : ''}
              </div>
            ))}
          </div>
          {myTeam !== 0 && (
            <button
              className="btn btn-small"
              style={{ background: TEAM_COLORS[0] }}
              onClick={() => onJoinTeam(0)}
            >
              הצטרף
            </button>
          )}
        </div>

        <div className="team-column">
          <h3 style={{ color: TEAM_COLORS[1] }}>{TEAM_NAMES[1]}</h3>
          <div className="team-players">
            {team1.map(p => (
              <div key={p.id} className={`player-tag ${p.id === myId ? 'me' : ''}`}>
                {p.name} {p.isHost ? '👑' : ''}
              </div>
            ))}
          </div>
          {myTeam !== 1 && (
            <button
              className="btn btn-small"
              style={{ background: TEAM_COLORS[1] }}
              onClick={() => onJoinTeam(1)}
            >
              הצטרף
            </button>
          )}
        </div>
      </div>

      {unassigned.length > 0 && (
        <div className="unassigned">
          <span className="unassigned-label">ממתינים: </span>
          {unassigned.map(p => (
            <span key={p.id} className="player-tag small">{p.name}</span>
          ))}
        </div>
      )}

      {error && <p className="error-text">{error}</p>}

      {amHost ? (
        <button
          className="btn btn-primary btn-large"
          onClick={onStartGame}
          disabled={!canStart}
        >
          {canStart ? 'התחל משחק!' : 'ממתין לשחקנים...'}
        </button>
      ) : (
        <p className="status-text">ממתין למארח להתחיל...</p>
      )}

      <button className="btn btn-secondary" onClick={onHome}>עזוב</button>
    </div>
  )
}
