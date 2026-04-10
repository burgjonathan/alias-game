import { useState, useEffect } from 'react'
import { socket } from './socket'
import HomeScreen from './components/HomeScreen'
import Lobby from './components/Lobby'
import GameScreen from './components/GameScreen'
import PlayRound from './components/PlayRound'
import RoundSummary from './components/RoundSummary'
import GameOver from './components/GameOver'

export const BOARD_SIZE = 40
export const TEAM_NAMES = ['קבוצה 1', 'קבוצה 2'] as const
export const TEAM_COLORS = ['#3498db', '#e67e22'] as const

export interface Player {
  id: string
  name: string
  team: 0 | 1 | null
  isHost: boolean
}

export interface RoomState {
  roomId: string
  code: string
  isPublic: boolean
  players: Player[]
  phase: 'lobby' | 'game' | 'playing' | 'summary' | 'gameover'
  positions: [number, number]
  currentTeam: 0 | 1
  roundCorrect: number
  roundSkipped: number
  describerId: string | null
  timeLeft: number
}

function App() {
  const [connected, setConnected] = useState(false)
  const [room, setRoom] = useState<RoomState | null>(null)
  const [currentWord, setCurrentWord] = useState<string | null>(null)
  const [myName, setMyName] = useState('')
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(60)

  useEffect(() => {
    socket.connect()

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('room-state', (state: RoomState) => {
      setRoom(state)
      setTimeLeft(state.timeLeft)
      setError('')
    })

    socket.on('word-update', ({ word }: { word: string | null }) => {
      setCurrentWord(word)
    })

    socket.on('timer-tick', ({ timeLeft: t }: { timeLeft: number }) => {
      setTimeLeft(t)
    })

    socket.on('error-msg', ({ message }: { message: string }) => {
      setError(message)
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('room-state')
      socket.off('word-update')
      socket.off('timer-tick')
      socket.off('error-msg')
      socket.disconnect()
    }
  }, [])

  const isMe = (id: string) => socket.id === id
  const amHost = room?.players.find(p => p.id === socket.id)?.isHost ?? false
  const myTeam = room?.players.find(p => p.id === socket.id)?.team ?? null
  const amDescriber = room?.describerId === socket.id

  const handleCreateRoom = (name: string, isPublic: boolean) => {
    setMyName(name)
    socket.emit('create-room', { name, isPublic })
  }

  const handleFindPublic = (name: string) => {
    setMyName(name)
    socket.emit('find-public-room', { name })
  }

  const handleJoinRoom = (name: string, code: string) => {
    setMyName(name)
    socket.emit('join-room', { code, name })
  }

  const handleJoinTeam = (team: 0 | 1) => {
    socket.emit('join-team', { team })
  }

  const handleStartGame = () => {
    socket.emit('start-game')
  }

  const handleStartRound = () => {
    socket.emit('start-round')
  }

  const handleCorrect = () => {
    socket.emit('word-correct')
  }

  const handleSkip = () => {
    socket.emit('word-skip')
  }

  const handleNextTurn = () => {
    socket.emit('next-turn')
  }

  const handlePlayAgain = () => {
    socket.emit('play-again')
  }

  const handleHome = () => {
    socket.disconnect()
    setRoom(null)
    setCurrentWord(null)
    setError('')
    setTimeout(() => socket.connect(), 100)
  }

  // Not in a room yet — show home
  if (!room) {
    return (
      <div className="app">
        <HomeScreen
          connected={connected}
          error={error}
          onCreateRoom={handleCreateRoom}
          onFindPublic={handleFindPublic}
          onJoinRoom={handleJoinRoom}
        />
      </div>
    )
  }

  return (
    <div className="app">
      {room.phase === 'lobby' && (
        <Lobby
          room={room}
          myId={socket.id!}
          amHost={amHost}
          myTeam={myTeam}
          error={error}
          onJoinTeam={handleJoinTeam}
          onStartGame={handleStartGame}
          onHome={handleHome}
        />
      )}
      {room.phase === 'game' && (
        <GameScreen
          room={room}
          myId={socket.id!}
          amHost={amHost}
          onStartRound={handleStartRound}
        />
      )}
      {room.phase === 'playing' && (
        <PlayRound
          word={currentWord}
          amDescriber={amDescriber}
          timeLeft={timeLeft}
          roundCorrect={room.roundCorrect}
          roundSkipped={room.roundSkipped}
          onCorrect={handleCorrect}
          onSkip={handleSkip}
        />
      )}
      {room.phase === 'summary' && (
        <RoundSummary
          room={room}
          onNext={handleNextTurn}
        />
      )}
      {room.phase === 'gameover' && (
        <GameOver
          room={room}
          onPlayAgain={handlePlayAgain}
          onHome={handleHome}
        />
      )}
    </div>
  )
}

export default App
