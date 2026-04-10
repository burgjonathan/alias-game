import { useState } from 'react'

interface Props {
  connected: boolean
  error: string
  onCreateRoom: (name: string, isPublic: boolean) => void
  onFindPublic: (name: string) => void
  onJoinRoom: (name: string, code: string) => void
}

type Mode = 'main' | 'join'

export default function HomeScreen({ connected, error, onCreateRoom, onFindPublic, onJoinRoom }: Props) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [mode, setMode] = useState<Mode>('main')

  const validName = name.trim().length >= 1

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
        style={{ background: '#27ae60' }}
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

      {!connected && <p className="status-text">מתחבר...</p>}
    </div>
  )
}
