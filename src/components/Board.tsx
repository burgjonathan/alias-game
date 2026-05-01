import { useRef, useEffect, useState } from 'react'
import { BOARD_SIZE, TEAM_COLORS } from '../App'

interface Props {
  positions: number[]
}

const COLS = 8
const HOP_MS = 280

function Pawn({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 120"
      className="pawn"
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

type AnimState = { cell: number; key: number } | null

export default function Board({ positions }: Props) {
  const boardRef = useRef<HTMLDivElement>(null)
  const prevPositions = useRef<number[]>(positions)
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>[]>>(new Map())

  const [anims, setAnims] = useState<AnimState[]>(() => positions.map(() => null))

  useEffect(() => {
    if (anims.length !== positions.length) {
      setAnims(positions.map((_, i) => anims[i] ?? null))
    }
  }, [positions.length, anims.length])

  useEffect(() => {
    const prev = prevPositions.current
    prevPositions.current = positions

    positions.forEach((to, team) => {
      const from = prev[team]
      if (from === undefined || from === to) return

      let teamTimers = timers.current.get(team)
      if (!teamTimers) {
        teamTimers = []
        timers.current.set(team, teamTimers)
      }
      teamTimers.forEach(clearTimeout)
      teamTimers.length = 0

      const step = from < to ? 1 : -1
      const cells: number[] = []
      for (let c = from + step; c !== to + step; c += step) cells.push(c)

      setAnims(prev => {
        const next = [...prev]
        while (next.length <= team) next.push(null)
        next[team] = { cell: from, key: 0 }
        return next
      })

      cells.forEach((cell, i) => {
        const t = setTimeout(() => {
          setAnims(prev => {
            const next = [...prev]
            next[team] = { cell, key: i + 1 }
            return next
          })
        }, (i + 1) * HOP_MS)
        teamTimers!.push(t)
      })

      const done = setTimeout(() => {
        setAnims(prev => {
          const next = [...prev]
          next[team] = null
          return next
        })
      }, (cells.length + 1) * HOP_MS)
      teamTimers.push(done)
    })
  }, [positions])

  useEffect(() => {
    const all = timers.current
    return () => {
      all.forEach(arr => arr.forEach(clearTimeout))
    }
  }, [])

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
    if (idx === BOARD_SIZE) return '★'
    return String(((idx - 1) % 8) + 1)
  }

  const isStealSpace = (idx: number) => idx > 0 && idx < BOARD_SIZE && idx % 8 === 0

  const overlayFor = (anim: AnimState, color: string) => {
    if (!anim) return null
    const pos = getCellPosition(anim.cell, boardRef.current)
    if (!pos) return null
    return (
      <div
        className="pawn-overlay"
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          transition: `transform ${HOP_MS}ms cubic-bezier(0.4, 0, 0.6, 1)`,
        }}
      >
        <div key={anim.key} className="pawn-hop">
          <Pawn color={color} />
        </div>
      </div>
    )
  }

  return (
    <div className="board" ref={boardRef} style={{ position: 'relative' }}>
      {snakeRows.map((row, rowIdx) => (
        <div className="board-row" key={rowIdx}>
          {row.map(cellIdx => {
            const isStart = cellIdx === 0
            const isFinish = cellIdx === BOARD_SIZE
            const steal = isStealSpace(cellIdx)

            let cellClass = 'board-cell'
            if (isStart) cellClass += ' cell-start'
            if (isFinish) cellClass += ' cell-finish'
            if (steal) cellClass += ' cell-steal'

            const teamsHere: number[] = []
            positions.forEach((pos, team) => {
              if (pos === cellIdx && !anims[team]) teamsHere.push(team)
            })

            return (
              <div key={cellIdx} className={cellClass} data-cell={cellIdx}>
                <span className="cell-label">{getCellLabel(cellIdx)}</span>
                <div className="cell-tokens">
                  {teamsHere.map(team => (
                    <Pawn key={team} color={TEAM_COLORS[team]} size={positions.length > 2 ? 18 : 22} />
                  ))}
                </div>
              </div>
            )
          })}
          {row.length < COLS && Array.from({ length: COLS - row.length }).map((_, i) => (
            <div key={`empty-${i}`} className="board-cell-empty" />
          ))}
        </div>
      ))}
      {anims.map((anim, team) => (
        <div key={team}>{overlayFor(anim, TEAM_COLORS[team])}</div>
      ))}
    </div>
  )
}
