import { BOARD_SIZE, TEAM_COLORS } from '../App'

interface Props {
  positions: [number, number]
}

const COLS = 8

// Classic Alias pawn as inline SVG
function Pawn({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 120" style={{ filter: `drop-shadow(0 2px 3px rgba(0,0,0,0.5))` }}>
      {/* Base */}
      <ellipse cx="50" cy="110" rx="35" ry="10" fill={color} />
      {/* Body */}
      <path d="M25 110 C25 70, 20 60, 35 45 C35 45, 50 38, 65 45 C80 60, 75 70, 75 110 Z" fill={color} />
      {/* Neck */}
      <rect x="40" y="30" width="20" height="18" rx="4" fill={color} />
      {/* Head */}
      <circle cx="50" cy="22" r="18" fill={color} />
      {/* Shine */}
      <ellipse cx="43" cy="16" rx="6" ry="8" fill="rgba(255,255,255,0.3)" />
    </svg>
  )
}

export default function Board({ positions }: Props) {
  // Build rows for snake pattern
  const rows: number[][] = []
  for (let i = 0; i <= BOARD_SIZE; i += COLS) {
    const row: number[] = []
    for (let j = 0; j < COLS && i + j <= BOARD_SIZE; j++) {
      row.push(i + j)
    }
    rows.push(row)
  }

  // Snake: reverse odd rows for winding path
  const snakeRows = rows.map((row, i) => (i % 2 === 1 ? [...row].reverse() : row))

  // Number each cell 1-8 repeating (like real Alias), except start/finish
  const getCellLabel = (idx: number): string => {
    if (idx === 0) return 'S'
    if (idx === BOARD_SIZE) return '★'
    return String(((idx - 1) % 8) + 1)
  }

  // Some cells are "steal" spaces (every 8th space in real game)
  const isStealSpace = (idx: number) => idx > 0 && idx < BOARD_SIZE && idx % 8 === 0

  return (
    <div className="board">
      {snakeRows.map((row, rowIdx) => (
        <div className="board-row" key={rowIdx}>
          {row.map(cellIdx => {
            const isStart = cellIdx === 0
            const isFinish = cellIdx === BOARD_SIZE
            const steal = isStealSpace(cellIdx)
            const team0Here = positions[0] === cellIdx
            const team1Here = positions[1] === cellIdx

            let cellClass = 'board-cell'
            if (isStart) cellClass += ' cell-start'
            if (isFinish) cellClass += ' cell-finish'
            if (steal) cellClass += ' cell-steal'

            return (
              <div key={cellIdx} className={cellClass}>
                <span className="cell-label">{getCellLabel(cellIdx)}</span>
                <div className="cell-tokens">
                  {team0Here && <Pawn color={TEAM_COLORS[0]} />}
                  {team1Here && <Pawn color={TEAM_COLORS[1]} />}
                </div>
              </div>
            )
          })}
          {/* Fill empty cells in last row */}
          {row.length < COLS && Array.from({ length: COLS - row.length }).map((_, i) => (
            <div key={`empty-${i}`} className="board-cell-empty" />
          ))}
        </div>
      ))}
    </div>
  )
}
