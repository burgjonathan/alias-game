import { useState } from 'react'

interface Props {
  connected: boolean
  error: string
  onCreateRoom: (name: string, isPublic: boolean) => void
  onFindPublic: (name: string) => void
  onJoinRoom: (name: string, code: string) => void
}

type Mode = 'main' | 'join' | 'rules'

const MIN_NAME = 2
const MAX_NAME = 12

function Rules({ onBack }: { onBack: () => void }) {
  return (
    <div className="screen home-screen">
      <h1 className="title" style={{ fontSize: 'clamp(2rem, 8vw, 3.5rem)' }}>ALIAS</h1>
      <div className="rules-card">
        <h2 className="rules-title">חוקי המשחק</h2>

        <div className="rules-section">
          <div className="rules-icon">👥</div>
          <div className="rules-text">
            <strong>הכנה</strong>
            <p>מתחלקים ל-2 קבוצות, לפחות 2 שחקנים בכל קבוצה. כל קבוצה מקבלת כלי משחק על לוח המשחק.</p>
          </div>
        </div>

        <div className="rules-section">
          <div className="rules-icon">🎯</div>
          <div className="rules-text">
            <strong>מטרת המשחק</strong>
            <p>להגיע ראשונים לסוף הלוח! הקבוצה הראשונה שמגיעה למשבצת הסיום מנצחת.</p>
          </div>
        </div>

        <div className="rules-section">
          <div className="rules-icon">🗣️</div>
          <div className="rules-text">
            <strong>איך מתארים</strong>
            <p>המתאר מסביר מילים בעזרת מילים אחרות - מילים נרדפות, הפכים, רמזים. אפשר גם להקליד רמזים בצ׳אט.</p>
          </div>
        </div>

        <div className="rules-section">
          <div className="rules-icon">🚫</div>
          <div className="rules-text">
            <strong>מה אסור</strong>
            <p>אסור להגיד את המילה עצמה או חלק ממנה! למשל אם המילה היא "שמש" אסור להגיד "שמשייה". אסור להשתמש בשפות זרות.</p>
          </div>
        </div>

        <div className="rules-section">
          <div className="rules-icon">💬</div>
          <div className="rules-text">
            <strong>ניחוש</strong>
            <p>שאר חברי הקבוצה מקלידים ניחושים. כל מילה שנוחשה נכון = צעד אחד קדימה על הלוח!</p>
          </div>
        </div>

        <div className="rules-section">
          <div className="rules-icon">⏱️</div>
          <div className="rules-text">
            <strong>זמן</strong>
            <p>לכל סיבוב יש 60 שניות. כשנגמר הזמן סופרים את התוצאות ועוברים לקבוצה השנייה.</p>
          </div>
        </div>

        <div className="rules-section">
          <div className="rules-icon">⬇️</div>
          <div className="rules-text">
            <strong>דילוג = צעד אחורה</strong>
            <p>מילה קשה מדי? אפשר לדלג, אבל כל דילוג מוריד את הקבוצה צעד אחורה על הלוח. אז כדאי לנסות!</p>
          </div>
        </div>

        <div className="rules-section">
          <div className="rules-icon">📊</div>
          <div className="rules-text">
            <strong>חישוב תזוזה</strong>
            <p>בסוף כל סיבוב: מילים נכונות פחות דילוגים = מספר הצעדים על הלוח. אפשר גם לזוז אחורה!</p>
          </div>
        </div>

        <div className="rules-section">
          <div className="rules-icon">🏆</div>
          <div className="rules-text">
            <strong>ניצחון</strong>
            <p>הקבוצה הראשונה שמגיעה למשבצת הסיום מנצחת את המשחק!</p>
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

  const trimmedName = name.trim()
  const validName = trimmedName.length >= MIN_NAME && trimmedName.length <= MAX_NAME
  const nameError = trimmedName.length > 0 && trimmedName.length < MIN_NAME
    ? `שם חייב להיות לפחות ${MIN_NAME} תווים`
    : trimmedName.length > MAX_NAME
    ? `שם יכול להיות עד ${MAX_NAME} תווים`
    : ''

  if (mode === 'rules') {
    return <Rules onBack={() => setMode('main')} />
  }

  if (mode === 'join') {
    return (
      <div className="screen home-screen">
        <h1 className="title">ALIAS</h1>

        <div className="input-wrapper">
          <input
            className="input"
            type="text"
            placeholder="השם שלך (2-12 תווים)"
            value={name}
            onChange={e => setName(e.target.value.slice(0, MAX_NAME))}
            dir="rtl"
            maxLength={MAX_NAME}
          />
          {nameError && <p className="input-hint">{nameError}</p>}
        </div>

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
          onClick={() => onJoinRoom(trimmedName, code.trim())}
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

      <div className="input-wrapper">
        <input
          className="input"
          type="text"
          placeholder="השם שלך (2-12 תווים)"
          value={name}
          onChange={e => setName(e.target.value.slice(0, MAX_NAME))}
          dir="rtl"
          maxLength={MAX_NAME}
        />
        {nameError && <p className="input-hint">{nameError}</p>}
      </div>

      {error && <p className="error-text">{error}</p>}

      <button
        className="btn btn-primary btn-large"
        onClick={() => onFindPublic(trimmedName)}
        disabled={!validName || !connected}
      >
        מצא משחק
      </button>

      <button
        className="btn btn-primary btn-large"
        style={{ background: 'linear-gradient(135deg, #2ecc71, #27ae60)' }}
        onClick={() => onCreateRoom(trimmedName, false)}
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
