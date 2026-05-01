import { useState, useEffect } from 'react'
import { RoomState, TEAM_NAMES, TEAM_COLORS, BOARD_SIZE } from '../App'
import Board from './Board'

interface Props {
  room: RoomState
  onNext: () => void
}

export default function RoundSummary({ room, onNext }: Props) {
  const currentTeam = room.currentTeam
  const otherTeam = currentTeam === 0 ? 1 : 0
  const net = room.roundCorrect - room.roundSkipped

  const fromPos = Math.max(0, Math.min(BOARD_SIZE, room.positions[currentTeam] - net))
  const startPositions: [number, number] = currentTeam === 0
    ? [fromPos, room.positions[1]]
    : [room.positions[0], fromPos]

  const [displayPositions, setDisplayPositions] = useState<[number, number]>(startPositions)

  useEffect(() => {
    const t = setTimeout(() => setDisplayPositions(room.positions), 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

      <Board positions={displayPositions} />

      <button className="btn btn-primary btn-large" onClick={onNext}>
        <span style={{ color: TEAM_COLORS[otherTeam] }}>התור של {TEAM_NAMES[otherTeam]}</span>
      </button>
    </div>
  )
}
