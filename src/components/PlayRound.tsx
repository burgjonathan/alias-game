interface Props {
  word: string | null
  amDescriber: boolean
  timeLeft: number
  roundCorrect: number
  roundSkipped: number
  onCorrect: () => void
  onSkip: () => void
}

export default function PlayRound({ word, amDescriber, timeLeft, roundCorrect, roundSkipped, onCorrect, onSkip }: Props) {
  const timerClass = timeLeft <= 10 ? 'timer danger' : timeLeft <= 20 ? 'timer warning' : 'timer'

  return (
    <div className="screen play-screen">
      <div className={timerClass}>{timeLeft}</div>

      <div className="round-live-score">
        <span className="live-correct">+{roundCorrect}</span>
        <span className="live-skip">-{roundSkipped}</span>
      </div>

      <div className="word-card">
        {amDescriber ? (
          <span className="word">{word}</span>
        ) : (
          <span className="word word-hidden">???</span>
        )}
      </div>

      {amDescriber ? (
        <div className="actions">
          <button className="btn btn-skip" onClick={onSkip}>
            דלג
          </button>
          <button className="btn btn-correct" onClick={onCorrect}>
            נכון!
          </button>
        </div>
      ) : (
        <p className="status-text">
          {word === null ? 'נחשו את המילה!' : ''}
        </p>
      )}
    </div>
  )
}
