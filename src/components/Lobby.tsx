import { RoomState, TEAM_NAMES, TEAM_COLORS, MAX_TEAMS, MAX_PLAYERS_PER_TEAM } from '../App'

interface Props {
  room: RoomState
  myId: string
  amHost: boolean
  myTeam: number | null
  error: string
  onJoinTeam: (team: number) => void
  onStartGame: () => void
  onHome: () => void
}

const TIMER_LABELS: Record<NonNullable<RoomState['lobbyTimer']>['kind'], string> = {
  start: 'המשחק מתחיל בעוד',
  rebalance: 'איזון קבוצות בעוד',
  autoassign: 'בחירה אוטומטית בעוד',
}

export default function Lobby({ room, myId, amHost, myTeam, error, onJoinTeam, onStartGame, onHome }: Props) {
  const teams: { idx: number; players: typeof room.players }[] = []
  for (let i = 0; i < room.numTeams; i++) {
    teams.push({ idx: i, players: room.players.filter(p => p.team === i) })
  }
  const unassigned = room.players.filter(p => p.team === null)

  const teamSizes = teams.map(t => t.players.length).filter(n => n > 0)
  const teamsWithEnough = teamSizes.filter(s => s >= 2).length
  const allValidSize = teamSizes.every(s => s >= 2)
  const canStartPrivate = teamsWithEnough >= 2 && allValidSize && unassigned.length === 0

  const canCreateTeam = !room.isPublic && room.numTeams < MAX_TEAMS

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
      <h2>{room.isPublic ? 'משחק ציבורי' : 'חדר משחק'}</h2>

      {!room.isPublic && (
        <div className="room-code-box">
          <span className="room-code-label">קוד חדר:</span>
          <span className="room-code">{room.code}</span>
          <button className="btn btn-small" onClick={handleShare}>שתף</button>
        </div>
      )}

      {room.lobbyTimer && (
        <div className={`lobby-timer lobby-timer-${room.lobbyTimer.kind}`}>
          <span>{TIMER_LABELS[room.lobbyTimer.kind]}</span>
          <span className="lobby-timer-seconds">{room.lobbyTimer.secondsLeft}s</span>
        </div>
      )}

      <div className="teams-grid">
        {teams.map(({ idx, players }) => {
          const color = TEAM_COLORS[idx]
          const full = players.length >= MAX_PLAYERS_PER_TEAM
          const showJoin = !room.isPublic && myTeam !== idx && !full
          return (
            <div key={idx} className="team-column">
              <h3 style={{ color }}>{TEAM_NAMES[idx]}</h3>
              <div className="team-meta">{players.length} / {MAX_PLAYERS_PER_TEAM}</div>
              <div className="team-players">
                {players.map(p => (
                  <div key={p.id} className={`player-tag ${p.id === myId ? 'me' : ''}`}>
                    {p.name} {p.isHost ? '👑' : ''}
                  </div>
                ))}
              </div>
              {showJoin && (
                <button
                  className="btn btn-small"
                  style={{ background: color }}
                  onClick={() => onJoinTeam(idx)}
                >
                  הצטרף
                </button>
              )}
            </div>
          )
        })}

        {canCreateTeam && (
          <div className="team-column team-column-add">
            <button
              className="btn btn-add-team"
              onClick={() => onJoinTeam(room.numTeams)}
            >
              + קבוצה חדשה
            </button>
          </div>
        )}
      </div>

      {!room.isPublic && unassigned.length > 0 && (
        <div className="unassigned">
          <span className="unassigned-label">ממתינים: </span>
          {unassigned.map(p => (
            <span key={p.id} className="player-tag small">{p.name}</span>
          ))}
        </div>
      )}

      {error && <p className="error-text">{error}</p>}

      {room.isPublic ? (
        <p className="status-text">
          {room.lobbyTimer?.kind === 'start'
            ? 'התחלת משחק...'
            : 'מחכים לאיזון הקבוצות...'}
        </p>
      ) : amHost ? (
        <button
          className="btn btn-primary btn-large"
          onClick={onStartGame}
          disabled={!canStartPrivate}
        >
          {canStartPrivate ? 'התחל משחק!' : 'ממתין לשחקנים...'}
        </button>
      ) : (
        <p className="status-text">ממתין למארח להתחיל...</p>
      )}

      <button className="btn btn-secondary" onClick={onHome}>עזוב</button>
    </div>
  )
}
