import { useRef, useEffect, useState } from 'react'
import { BOARD_SIZE, TEAM_COLORS } from '../App'

interface Props {
  positions: [number, number]
}

const COLS = 8

function Pawn({ color, size = 22, walking }: { color: string; size?: number; walking: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 120"
      className={`pawn ${walking ? 'pawn-walking' : ''}`}
      style={{ filter: `drop-shadow(0 2px 3px rgba(0,0,0,0.5))` }}
    >
      <ellipse cx="50" cy="110" rx="35" ry="10" fill={color} />
      <path d="M25 110 C25 70, 20 60, 35 45 C35 45, 50 38, 65 45 C80 60, 75 70, 75 110 Z" fill={color} />
      <rect x="40" y="30" width="20" height="18" rx="4" fill={color} />
      <circle cx="50" cy="22" r="18" fill={color} />
      <ellipse cx="43" cy="16" rx="6" ry="8" fill="rgba(255,255,255,0.3)" />
    </svg>
  )
}

// Map cell index to pixel position on the board for overlay animation
function getCellPosition(cellIdx: number, boardEl: HTMLDivElement | null): { x: number; y: number } | null {
  if (!boardEl) return null
  const cell = boardEl.querySelector(`[data-cell="${cellIdx}"]`) as HTMLElement | null
  if (!cell) return null
  const boardRect = boardEl.getBoundingClientRect()
  const cellRect = cell.getBoundingClientRect()
  return {
    x: cellRect.left - boardRect.left + cellRect.width / 2,
    y: cellRect.top - boardRect.top + cellRect.height / 2,
  }
}

export default function Board({ positions }: Props) {
  const boardRef = useRef<HTMLDivElement>(null)
  const prevPositions = useRef<[number, number]>(positions)
  const [animating, setAnimating] = useState<[boolean, boolean]>([false, false])
  const [overlayPos, setOverlayPos] = useState<[{ x: number; y: number } | null, { x: number; y: number } | null]>([null, null])

  // Detect position changes and trigger animation
  useEffect(() => {
    const prev = prevPositions.current
    const changed: [boolean, boolean] = [prev[0] !== positions[0], prev[1] !== positions[1]]

    if (changed[0] || changed[1]) {
      // Animate each team that moved
      setAnimating(changed)

      // After animation ends, stop
      const timeout = setTimeout(() => {
        setAnimating([false, false])
        prevPositions.current = positions
      }, 600)

      return () => clearTimeout(timeout)
    }
  }, [positions])

  // Update overlay positions for animated pawns
  useEffect(() => {
    if (!boardRef.current) return
    const pos0 = getCellPosition(positions[0], boardRef.current)
    const pos1 = getCellPosition(positions[1], boardRef.current)
    setOverlayPos([pos0, pos1])
  }, [positions])

  const rows: number[][] = []
  for (let i = 0; i <= BOARD_SIZE; i += COLS) {
    const row: number[] = []
    for (let j = 0; j < COLS && i + j <= BOARD_SIZE; j++) {
      row.push(i + j)
    }
    rows.push(row)
  }

  const snakeRows = rows.map((row, i) => (i % 2 === 1 ? [...row].reverse() : row))

  const getCellLabel = (idx: number): string => {
    if (idx === 0) return 'S'
    if (idx === BOARD_SIZE) return '\u2605'
    return String(((idx - 1) % 8) + 1)
  }

  const isStealSpace = (idx: number) => idx > 0 && idx < BOARD_SIZE && idx % 8 === 0

  return (
    <div className="board" ref={boardRef} style={{ position: 'relative' }}>
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
              <div key={cellIdx} className={cellClass} data-cell={cellIdx}>
                <span className="cell-label">{getCellLabel(cellIdx)}</span>
                <div className="cell-tokens">
                  {team0Here && <Pawn color={TEAM_COLORS[0]} walking={animating[0]} />}
                  {team1Here && <Pawn color={TEAM_COLORS[1]} walking={animating[1]} />}
                </div>
              </div>
            )
          })}
          {row.length < COLS && Array.from({ length: COLS - row.length }).map((_, i) => (
            <div key={`empty-${i}`} className="board-cell-empty" />
          ))}
        </div>
      ))}
    </div>
  )
}
