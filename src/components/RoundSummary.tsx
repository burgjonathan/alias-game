import { RoomState, TEAM_NAMES, TEAM_COLORS } from '../App'
import Board from './Board'

interface Props {
  room: RoomState
  onNext: () => void
}

export default function RoundSummary({ room, onNext }: Props) {
  const currentTeam = room.currentTeam
  const otherTeam = currentTeam === 0 ? 1 : 0
  const net = room.roundCorrect - room.roundSkipped

  return (
    <div className="screen summary-screen">
      <h2>!נגמר הזמן</h2>

      <div className="round-results">
        <div className="result-item correct">
          <span className="result-label">נכון</span>
          <span className="result-value">+{room.roundCorrect}</span>
        </div>
        <div className="result-item skipped">
          <span className="result-label">דילוגים</span>
          <span className="result-value">-{room.roundSkipped}</span>
        </div>
        <div className="result-item net">
          <span className="result-label">סה״כ תזוזה</span>
          <span className="result-value" style={{ color: net >= 0 ? '#27ae60' : '#e74c3c' }}>
            {net >= 0 ? `+${net}` : net}
          </span>
        </div>
      </div>

      <Board positions={room.positions} />

      <button className="btn btn-primary btn-large" onClick={onNext}>
        <span style={{ color: TEAM_COLORS[otherTeam] }}>התור של {TEAM_NAMES[otherTeam]}</span>
      </button>
    </div>
  )
}
