import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  createRoom, findPublicRoom, joinRoom, getRoomByCode, getRoom,
  setPlayerTeam, setPlayerName, removePlayer, canStartGame,
  startGame, startRound, getCurrentWord, checkGuess, wordCorrect, wordSkip,
  endRound, nextTurn, resetGame,
  assignToBalancedTeam, autoAssignUnassigned, tryRebalance, isLobbyBalanced,
  hasMinimumToPlay, compactEmptyTeams,
  MIN_PLAYERS_PER_TEAM, START_COUNTDOWN_SECONDS, REBALANCE_SECONDS, AUTOASSIGN_SECONDS,
  type Room, type LobbyTimerKind,
} from './rooms.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const server = createServer(app)

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173'],
  },
})

const distPath = path.join(__dirname, '..', '..', 'dist')
app.use(express.static(distPath))
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

const socketRooms = new Map<string, string>()

function emitRoomState(room: Room) {
  const publicPlayers = room.players.map(p => ({
    id: p.id, name: p.name, team: p.team, isHost: p.isHost,
  }))

  const lobbyTimer = room.lobbyTimer
    ? { kind: room.lobbyTimer.kind, secondsLeft: room.lobbyTimer.secondsLeft }
    : null

  const state = {
    roomId: room.id,
    code: room.code,
    isPublic: room.isPublic,
    numTeams: room.numTeams,
    players: publicPlayers,
    phase: room.game.phase,
    positions: room.game.positions,
    currentTeam: room.game.currentTeam,
    roundCorrect: room.game.roundCorrect,
    roundSkipped: room.game.roundSkipped,
    describerId: room.game.describerId,
    timeLeft: room.game.timeLeft,
    lobbyTimer,
  }

  io.to(room.id).emit('room-state', state)
}

function cancelLobbyTimer(room: Room) {
  if (room.lobbyTimer) {
    clearInterval(room.lobbyTimer.intervalId)
    room.lobbyTimer = null
  }
}

function startLobbyTimer(room: Room, kind: LobbyTimerKind, seconds: number, onExpire: () => void) {
  cancelLobbyTimer(room)
  const intervalId = setInterval(() => {
    if (!room.lobbyTimer) return
    room.lobbyTimer.secondsLeft--
    if (room.lobbyTimer.secondsLeft <= 0) {
      const id = room.lobbyTimer.intervalId
      room.lobbyTimer = null
      clearInterval(id)
      onExpire()
      emitRoomState(room)
      return
    }
    emitRoomState(room)
  }, 1000)
  room.lobbyTimer = { kind, secondsLeft: seconds, intervalId }
}

function evaluateLobby(room: Room) {
  if (room.game.phase !== 'lobby') {
    cancelLobbyTimer(room)
    return
  }

  if (room.isPublic) {
    const balanced = isLobbyBalanced(room)
    const enough = hasMinimumToPlay(room)

    if (balanced && enough) {
      if (room.lobbyTimer?.kind === 'start') return
      startLobbyTimer(room, 'start', START_COUNTDOWN_SECONDS, () => {
        startGame(room)
      })
    } else if (enough) {
      if (room.lobbyTimer?.kind === 'rebalance') return
      startLobbyTimer(room, 'rebalance', REBALANCE_SECONDS, () => {
        if (tryRebalance(room)) {
          evaluateLobby(room)
        }
      })
    } else {
      cancelLobbyTimer(room)
    }
  } else {
    const hasUnassigned = room.players.some(p => p.team === null)
    if (hasUnassigned) {
      if (room.lobbyTimer?.kind === 'autoassign') return
      startLobbyTimer(room, 'autoassign', AUTOASSIGN_SECONDS, () => {
        autoAssignUnassigned(room)
        evaluateLobby(room)
      })
    } else {
      cancelLobbyTimer(room)
    }
  }
}

function sendWordToDescriber(room: Room) {
  if (!room.game.describerId) return
  const word = getCurrentWord(room)
  io.to(room.game.describerId).emit('word-update', { word })
  room.players.forEach(p => {
    if (p.id !== room.game.describerId) {
      io.to(p.id).emit('word-update', { word: null })
    }
  })
}

function startTimer(room: Room) {
  room.game.timeLeft = 60
  room.game.timerInterval = setInterval(() => {
    room.game.timeLeft--
    io.to(room.id).emit('timer-tick', { timeLeft: room.game.timeLeft })

    if (room.game.timeLeft <= 0) {
      endRound(room)
      emitRoomState(room)
    }
  }, 1000)
}

io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id}`)

  socket.on('create-room', ({ name, isPublic }: { name: string; isPublic: boolean }) => {
    const room = createRoom(socket.id, name, isPublic)
    socket.join(room.id)
    socketRooms.set(socket.id, room.id)
    if (isPublic) assignToBalancedTeam(room, socket.id)
    evaluateLobby(room)
    emitRoomState(room)
  })

  socket.on('find-public-room', ({ name }: { name: string }) => {
    let room = findPublicRoom()
    if (room) {
      joinRoom(room.id, socket.id, name)
    } else {
      room = createRoom(socket.id, name, true)
    }
    socket.join(room.id)
    socketRooms.set(socket.id, room.id)
    assignToBalancedTeam(room, socket.id)
    evaluateLobby(room)
    emitRoomState(room)
  })

  socket.on('join-room', ({ code, name }: { code: string; name: string }) => {
    const found = getRoomByCode(code)
    if (!found) {
      socket.emit('error-msg', { message: 'חדר לא נמצא' })
      return
    }
    if (found.game.phase !== 'lobby') {
      socket.emit('error-msg', { message: 'המשחק כבר התחיל' })
      return
    }
    const room = joinRoom(found.id, socket.id, name)
    if (!room) {
      socket.emit('error-msg', { message: 'שגיאה בהצטרפות' })
      return
    }
    socket.join(room.id)
    socketRooms.set(socket.id, room.id)
    if (room.isPublic) assignToBalancedTeam(room, socket.id)
    evaluateLobby(room)
    emitRoomState(room)
  })

  socket.on('set-name', ({ name }: { name: string }) => {
    const roomId = socketRooms.get(socket.id)
    if (!roomId) return
    const room = getRoom(roomId)
    if (!room) return
    setPlayerName(room, socket.id, name)
    emitRoomState(room)
  })

  socket.on('join-team', ({ team }: { team: number }) => {
    const roomId = socketRooms.get(socket.id)
    if (!roomId) return
    const room = getRoom(roomId)
    if (!room) return
    if (room.isPublic) {
      socket.emit('error-msg', { message: 'בחירת קבוצה אוטומטית במשחק ציבורי' })
      return
    }
    if (!setPlayerTeam(room, socket.id, team)) {
      socket.emit('error-msg', { message: 'הקבוצה מלאה' })
      return
    }
    evaluateLobby(room)
    emitRoomState(room)
  })

  socket.on('start-game', () => {
    const roomId = socketRooms.get(socket.id)
    if (!roomId) return
    const room = getRoom(roomId)
    if (!room || room.host !== socket.id) return
    if (room.isPublic) return
    if (!canStartGame(room)) {
      socket.emit('error-msg', { message: `כל קבוצה צריכה לפחות ${MIN_PLAYERS_PER_TEAM} שחקנים` })
      return
    }
    compactEmptyTeams(room)
    startGame(room)
    emitRoomState(room)
  })

  socket.on('start-round', () => {
    const roomId = socketRooms.get(socket.id)
    if (!roomId) return
    const room = getRoom(roomId)
    if (!room) return

    const describerId = startRound(room)
    if (!describerId) return

    startTimer(room)
    emitRoomState(room)
    sendWordToDescriber(room)
  })

  socket.on('guess', ({ text }: { text: string }) => {
    const roomId = socketRooms.get(socket.id)
    if (!roomId) return
    const room = getRoom(roomId)
    if (!room || room.game.phase !== 'playing') return
    if (socket.id === room.game.describerId) return
    const player = room.players.find(p => p.id === socket.id)
    if (!player || player.team !== room.game.currentTeam) return

    const isCorrect = checkGuess(room, text)

    if (isCorrect) {
      const word = getCurrentWord(room)
      wordCorrect(room)
      io.to(room.id).emit('guess-result', {
        playerId: socket.id,
        playerName: player.name,
        text,
        correct: true,
        word,
      })
      emitRoomState(room)
      sendWordToDescriber(room)
    } else {
      io.to(room.id).emit('guess-result', {
        playerId: socket.id,
        playerName: player.name,
        text,
        correct: false,
        word: null,
      })
    }
  })

  socket.on('clue', ({ text }: { text: string }) => {
    const roomId = socketRooms.get(socket.id)
    if (!roomId) return
    const room = getRoom(roomId)
    if (!room || room.game.phase !== 'playing') return
    if (socket.id !== room.game.describerId) return
    const player = room.players.find(p => p.id === socket.id)
    if (!player) return

    const currentWord = getCurrentWord(room)
    const normalizedClue = text.replace(/[֑-ׇ'"״׳]/g, '').trim().toLowerCase()
    const normalizedWord = currentWord.replace(/[֑-ׇ'"״׳]/g, '').trim().toLowerCase()
    if (normalizedClue.includes(normalizedWord)) {
      socket.emit('error-msg', { message: 'אסור להשתמש במילה עצמה!' })
      return
    }

    io.to(room.id).emit('clue-result', {
      playerId: socket.id,
      playerName: player.name,
      text,
    })
  })

  socket.on('word-skip', () => {
    const roomId = socketRooms.get(socket.id)
    if (!roomId) return
    const room = getRoom(roomId)
    if (!room || room.game.describerId !== socket.id) return
    wordSkip(room)
    emitRoomState(room)
    sendWordToDescriber(room)
  })

  socket.on('next-turn', () => {
    const roomId = socketRooms.get(socket.id)
    if (!roomId) return
    const room = getRoom(roomId)
    if (!room) return
    nextTurn(room)
    emitRoomState(room)
  })

  socket.on('play-again', () => {
    const roomId = socketRooms.get(socket.id)
    if (!roomId) return
    const room = getRoom(roomId)
    if (!room) return
    resetGame(room)
    if (room.isPublic) {
      room.players.forEach(p => assignToBalancedTeam(room, p.id))
    }
    evaluateLobby(room)
    emitRoomState(room)
  })

  socket.on('webrtc-offer', ({ to, offer }: { to: string; offer: RTCSessionDescriptionInit }) => {
    io.to(to).emit('webrtc-offer', { from: socket.id, offer })
  })

  socket.on('webrtc-answer', ({ to, answer }: { to: string; answer: RTCSessionDescriptionInit }) => {
    io.to(to).emit('webrtc-answer', { from: socket.id, answer })
  })

  socket.on('webrtc-ice', ({ to, candidate }: { to: string; candidate: RTCIceCandidateInit }) => {
    io.to(to).emit('webrtc-ice', { from: socket.id, candidate })
  })

  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`)
    const roomId = socketRooms.get(socket.id)
    if (!roomId) return
    const room = removePlayer(roomId, socket.id)
    socketRooms.delete(socket.id)
    if (room) {
      io.to(room.id).emit('peer-disconnected', { peerId: socket.id })
      // For public rooms, re-balance leftover players if needed; trim empty trailing teams.
      if (room.isPublic && room.game.phase === 'lobby') {
        compactEmptyTeams(room)
      }
      evaluateLobby(room)
      emitRoomState(room)
    }
  })
})

const PORT = parseInt(process.env.PORT || '3001')
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
