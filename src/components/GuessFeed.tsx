import { useState, useRef, useEffect } from 'react'

export interface GuessEntry {
  id: number
  playerId: string
  playerName: string
  text: string
  correct: boolean
  word: string | null
}

interface Props {
  guesses: GuessEntry[]
  canGuess: boolean
  onGuess: (text: string) => void
}

export default function GuessFeed({ guesses, canGuess, onGuess }: Props) {
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
    onGuess(trimmed)
    setInput('')
  }

  return (
    <div className="guess-feed-container">
      <div className="guess-feed" ref={feedRef}>
        {guesses.map(g => (
          <div key={g.id} className={`guess-entry ${g.correct ? 'guess-correct' : 'guess-wrong'}`}>
            <span className="guess-name">{g.playerName}:</span>
            <span className="guess-text">
              {g.correct ? `${g.word} ✓` : g.text}
            </span>
          </div>
        ))}
      </div>
      {canGuess && (
        <form className="guess-input-bar" onSubmit={handleSubmit}>
          <input
            className="guess-input"
            type="text"
            placeholder="הקלד/י ניחוש..."
            value={input}
            onChange={e => setInput(e.target.value)}
            dir="rtl"
            autoComplete="off"
          />
          <button className="guess-send-btn" type="submit">שלח</button>
        </form>
      )}
    </div>
  )
}
