import { useState, useRef, useEffect } from 'react'

export interface GuessEntry {
  id: number
  playerId: string
  playerName: string
  text: string
  correct: boolean
  word: string | null
  type: 'guess' | 'clue'
}

interface Props {
  guesses: GuessEntry[]
  canGuess: boolean
  canDescribe: boolean
  onGuess: (text: string) => void
  onClue: (text: string) => void
}

export default function GuessFeed({ guesses, canGuess, canDescribe, onGuess, onClue }: Props) {
  const [input, setInput] = useState('')
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [guesses])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return
    if (canDescribe) {
      onClue(trimmed)
    } else {
      onGuess(trimmed)
    }
    setInput('')
  }

  return (
    <div className="guess-feed-container">
      <div className="guess-feed" ref={feedRef}>
        {guesses.map(g => (
          <div key={g.id} className={`guess-entry ${g.correct ? 'guess-correct' : g.type === 'clue' ? 'guess-clue' : 'guess-wrong'}`}>
            <span className="guess-name">{g.playerName}:</span>
            <span className="guess-text">
              {g.correct ? `${g.word} ✓` : g.text}
            </span>
          </div>
        ))}
      </div>
      {(canGuess || canDescribe) && (
        <form className="guess-input-bar" onSubmit={handleSubmit}>
          <input
            className={`guess-input ${canDescribe ? 'guess-input-describer' : ''}`}
            type="text"
            placeholder={canDescribe ? 'תאר/י את המילה...' : 'הקלד/י ניחוש...'}
            value={input}
            onChange={e => setInput(e.target.value)}
            dir="rtl"
            autoComplete="off"
          />
          <button className={`guess-send-btn ${canDescribe ? 'guess-send-describer' : ''}`} type="submit">
            שלח
          </button>
        </form>
      )}
    </div>
  )
}
