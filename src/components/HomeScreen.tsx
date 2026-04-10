import { useState } from 'react'

interface Props {
  connected: boolean
  error: string
  onCreateRoom: (name: string, isPublic: boolean) => void
  onFindPublic: (name: string) => void
  onJoinRoom: (name: string, code: string) => void
}

type Mode = 'main' | 'join' | 'rules'

function Rules({ onBack }: { onBack: () => void }) {
  return (
    <div className="screen home-screen">
      <h1 className="title" style={{ fontSize: 'clamp(2rem, 8vw, 3.5rem)' }}>ALIAS</h1>
      <div className="rules-card">
        <h2 className="rules-title">איך משחקים?</h2>

        <div className="rules-section">
          <div className="rules-icon">👥</div>
          <div className="rules-text">
            <strong>קבוצות</strong>
            <p>מתחלקים ל-2 קבוצות, לפחות 2 שחקנים בכל קבוצה</p>
          </div>
        </div>

        <div className="rules-section">
          <div className="rules-icon">🎯</div>
          <div className="rules-text">
            <strong>המטרה</strong>
            <p>להגיע ראשונים לסוף הלוח (משבצת 40)</p>
          </div>
        </div>

        <div className="rules-section">
          <div className="rules-icon">🗣️</div>
          <div className="rules-text">
            <strong>המתאר</strong>
            <p>בכל תור שחקן אחד מתאר מילים - בלי להגיד את המילה עצמה! אפשר רק לדלג</p>
          </div>
        </div>

        <div className="rules-section">
          <div className="rules-icon">💬</div>
          <div className="rules-text">
            <strong>המנחשים</strong>
            <p>שאר חברי הקבוצה מקלידים ניחושים. ניחוש נכון = צעד קדימה!</p>
          </div>
        </div>

        <div className="rules-section">
          <div className="rules-icon">⏱️</div>
          <div className="rules-text">
            <strong>זמן</strong>
            <p>לכל סיבוב יש 60 שניות. כשנגמר הזמן - עוברים לקבוצה השנייה</p>
          </div>
        </div>

        <div className="rules-section">
          <div className="rules-icon">⚠️</div>
          <div className="rules-text">
            <strong>דילוג = עונש</strong>
            <p>כל דילוג מוריד צעד אחורה! אז תנסו לתאר גם מילים קשות</p>
          </div>
        </div>

        <div className="rules-section">
          <div className="rules-icon">📹</div>
          <div className="rules-text">
            <strong>וידאו וקול</strong>
            <p>המשחק כולל צ׳אט וידאו - כולם רואים ושומעים אחד את השני</p>
          </div>
        </div>
      </div>

      <button className="btn btn-secondary btn-large" onClick={onBack}>
        חזרה
      </button>
    </div>
  )
}

export default function HomeScreen({ connected, error, onCreateRoom, onFindPublic, onJoinRoom }: Props) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [mode, setMode] = useState<Mode>('main')

  const validName = name.trim().length >= 1

  if (mode === 'rules') {
    return <Rules onBack={() => setMode('main')} />
  }

  if (mode === 'join') {
    return (
      <div className="screen home-screen">
        <h1 className="title">ALIAS</h1>

        <input
          className="input"
          type="text"
          placeholder="השם שלך"
          value={name}
          onChange={e => setName(e.target.value)}
          dir="rtl"
        />

        <input
          className="input"
          type="text"
          placeholder="קוד חדר"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          maxLength={5}
          style={{ letterSpacing: '0.3em', textAlign: 'center', direction: 'ltr' }}
        />

        {error && <p className="error-text">{error}</p>}

        <button
          className="btn btn-primary btn-large"
          onClick={() => onJoinRoom(name.trim(), code.trim())}
          disabled={!validName || code.trim().length < 5 || !connected}
        >
          הצטרף
        </button>

        <button className="btn btn-secondary" onClick={() => setMode('main')}>
          חזרה
        </button>
      </div>
    )
  }

  return (
    <div className="screen home-screen">
      <h1 className="title">ALIAS</h1>
      <p className="subtitle">משחק תיאור מילים</p>

      <input
        className="input"
        type="text"
        placeholder="השם שלך"
        value={name}
        onChange={e => setName(e.target.value)}
        dir="rtl"
      />

      {error && <p className="error-text">{error}</p>}

      <button
        className="btn btn-primary btn-large"
        onClick={() => onFindPublic(name.trim())}
        disabled={!validName || !connected}
      >
        מצא משחק
      </button>

      <button
        className="btn btn-primary btn-large"
        style={{ background: 'linear-gradient(135deg, #2ecc71, #27ae60)' }}
        onClick={() => onCreateRoom(name.trim(), false)}
        disabled={!validName || !connected}
      >
        צור חדר פרטי
      </button>

      <button
        className="btn btn-secondary btn-large"
        onClick={() => setMode('join')}
      >
        הצטרף עם קוד
      </button>

      <button
        className="btn btn-secondary btn-large"
        onClick={() => setMode('rules')}
      >
        חוקי המשחק
      </button>

      {!connected && <p className="status-text">מתחבר...</p>}
    </div>
  )
}
