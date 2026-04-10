import { RoomState, TEAM_NAMES, TEAM_COLORS } from '../App'
import Board from './Board'

interface Props {
  room: RoomState
  onPlayAgain: () => void
  onHome: () => void
}

export default function GameOver({ room, onPlayAgain, onHome }: Props) {
  const winner = room.positions[0] >= 40 ? 0 : 1

  return (
    <div className="screen gameover-screen">
      <div className="trophy">🏆</div>
      <h1 style={{ color: TEAM_COLORS[winner] }}>
        {TEAM_NAMES[winner]} ניצחה!
      </h1>

      <Board positions={room.positions} />

      <div className="gameover-actions">
        <button className="btn btn-primary" onClick={onPlayAgain}>
          משחק חדש
        </button>
        <button className="btn btn-secondary" onClick={onHome}>
          מסך ראשי
        </button>
      </div>
    </div>
  )
}
