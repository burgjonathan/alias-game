import { useState, useEffect, useCallback } from 'react'
import { socket } from './socket'
import { useWebRTC } from './hooks/useWebRTC'
import HomeScreen from './components/HomeScreen'
import Lobby from './components/Lobby'
import GameScreen from './components/GameScreen'
import PlayRound from './components/PlayRound'
import RoundSummary from './components/RoundSummary'
import GameOver from './components/GameOver'
import type { GuessEntry } from './components/GuessFeed'

export const BOARD_SIZE = 40
export const MAX_TEAMS = 4
export const MAX_PLAYERS_PER_TEAM = 4
export const TEAM_NAMES = ['קבוצה 1', 'קבוצה 2', 'קבוצה 3', 'קבוצה 4'] as const
export const TEAM_COLORS = ['#3498db', '#e67e22', '#27ae60', '#9b59b6'] as const

export type TeamIdx = 0 | 1 | 2 | 3

export interface Player {
  id: string
  name: string
  team: TeamIdx | null
  isHost: boolean
}

export interface LobbyTimerState {
  kind: 'start' | 'rebalance' | 'autoassign'
  secondsLeft: number
}

export interface RoomState {
  roomId: string
  code: string
  isPublic: boolean
  numTeams: number
  players: Player[]
  phase: 'lobby' | 'game' | 'playing' | 'summary' | 'gameover'
  positions: number[]
  currentTeam: number
  roundCorrect: number
  roundSkipped: number
  describerId: string | null
  timeLeft: number
  lobbyTimer: LobbyTimerState | null
}

let guessIdCounter = 0

function App() {
  const [connected, setConnected] = useState(false)
  const [room, setRoom] = useState<RoomState | null>(null)
  const [currentWord, setCurrentWord] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(60)
  const [guesses, setGuesses] = useState<GuessEntry[]>([])

  const playerIds = room?.players.map(p => p.id) ?? []
  const inRoom = room !== null && room.phase !== 'lobby'
  const webrtc = useWebRTC(socket, playerIds, socket.id, inRoom)

  useEffect(() => {
    socket.connect()

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('room-state', (state: RoomState) => {
      setRoom(prev => {
        // Clear guesses when phase changes to playing (new round)
        if (prev?.phase !== 'playing' && state.phase === 'playing') {
          setGuesses([])
        }
        return state
      })
      setTimeLeft(state.timeLeft)
      setError('')
    })

    socket.on('word-update', ({ word }: { word: string | null }) => {
      setCurrentWord(word)
    })

    socket.on('timer-tick', ({ timeLeft: t }: { timeLeft: number }) => {
      setTimeLeft(t)
    })

    socket.on('guess-result', (result: { playerId: string; playerName: string; text: string; correct: boolean; word: string | null }) => {
      setGuesses(prev => [...prev, { ...result, id: ++guessIdCounter, type: 'guess' as const }])
    })

    socket.on('clue-result', (result: { playerId: string; playerName: string; text: string }) => {
      setGuesses(prev => [...prev, { ...result, id: ++guessIdCounter, type: 'clue' as const, correct: false, word: null }])
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
      socket.off('guess-result')
      socket.off('clue-result')
      socket.off('error-msg')
      socket.disconnect()
    }
  }, [])

  const amDescriber = room?.describerId === socket.id

  const handleCreateRoom = (name: string, isPublic: boolean) => {
    socket.emit('create-room', { name, isPublic })
  }

  const handleFindPublic = (name: string) => {
    socket.emit('find-public-room', { name })
  }

  const handleJoinRoom = (name: string, code: string) => {
    socket.emit('join-room', { code, name })
  }

  const handleJoinTeam = (team: number) => {
    socket.emit('join-team', { team })
  }

  const handleStartGame = () => socket.emit('start-game')
  const handleStartRound = () => socket.emit('start-round')
  const handleSkip = () => socket.emit('word-skip')
  const handleNextTurn = () => socket.emit('next-turn')
  const handlePlayAgain = () => socket.emit('play-again')

  const handleGuess = useCallback((text: string) => {
    socket.emit('guess', { text })
  }, [])

  const handleClue = useCallback((text: string) => {
    socket.emit('clue', { text })
  }, [])

  const handleHome = () => {
    socket.disconnect()
    setRoom(null)
    setCurrentWord(null)
    setError('')
    setGuesses([])
    setTimeout(() => socket.connect(), 100)
  }

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

  const myTeam = room.players.find(p => p.id === socket.id)?.team ?? null
  const amHost = room.players.find(p => p.id === socket.id)?.isHost ?? false

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
          onSkip={handleSkip}
          onGuess={handleGuess}
          onClue={handleClue}
          guesses={guesses}
          localStream={webrtc.localStream}
          remoteStreams={webrtc.remoteStreams}
          activeSpeaker={webrtc.activeSpeaker}
          describerId={room.describerId}
          myId={socket.id!}
          players={room.players}
          audioEnabled={webrtc.audioEnabled}
          videoEnabled={webrtc.videoEnabled}
          onToggleAudio={webrtc.toggleAudio}
          onToggleVideo={webrtc.toggleVideo}
          onRequestPermission={webrtc.requestPermission}
        />
      )}
      {room.phase === 'summary' && (
        <RoundSummary room={room} onNext={handleNextTurn} />
      )}
      {room.phase === 'gameover' && (
        <GameOver room={room} onPlayAgain={handlePlayAgain} onHome={handleHome} />
      )}
    </div>
  )
}

export default App
