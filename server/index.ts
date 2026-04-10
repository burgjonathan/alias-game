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
  type Room,
} from './rooms.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const server = createServer(app)

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173'],
  },
})

// Serve static frontend in production
const distPath = path.join(__dirname, '..', 'dist')
app.use(express.static(distPath))
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

// Track which room each socket is in
const socketRooms = new Map<string, string>()

function emitRoomState(room: Room) {
  const publicPlayers = room.players.map(p => ({
    id: p.id, name: p.name, team: p.team, isHost: p.isHost,
  }))

  const state = {
    roomId: room.id,
    code: room.code,
    isPublic: room.isPublic,
    players: publicPlayers,
    phase: room.game.phase,
    positions: room.game.positions,
    currentTeam: room.game.currentTeam,
    roundCorrect: room.game.roundCorrect,
    roundSkipped: room.game.roundSkipped,
    describerId: room.game.describerId,
    timeLeft: room.game.timeLeft,
  }

  io.to(room.id).emit('room-state', state)
}

function sendWordToDescriber(room: Room) {
  if (!room.game.describerId) return
  const word = getCurrentWord(room)
  io.to(room.game.describerId).emit('word-update', { word })
  // Send masked word to everyone else
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

  socket.on('join-team', ({ team }: { team: 0 | 1 }) => {
    const roomId = socketRooms.get(socket.id)
    if (!roomId) return
    const room = getRoom(roomId)
    if (!room) return
    setPlayerTeam(room, socket.id, team)
    emitRoomState(room)
  })

  socket.on('start-game', () => {
    const roomId = socketRooms.get(socket.id)
    if (!roomId) return
    const room = getRoom(roomId)
    if (!room || room.host !== socket.id) return
    if (!canStartGame(room)) {
      socket.emit('error-msg', { message: 'צריך לפחות שחקן אחד בכל קבוצה' })
      return
    }
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

  // Guess event: guessers submit guesses, server auto-checks
  socket.on('guess', ({ text }: { text: string }) => {
    const roomId = socketRooms.get(socket.id)
    if (!roomId) return
    const room = getRoom(roomId)
    if (!room || room.game.phase !== 'playing') return
    // Only guessers on the current team can guess (not the describer)
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
    emitRoomState(room)
  })

  // WebRTC signaling relay
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
      emitRoomState(room)
    }
  })
})

const PORT = parseInt(process.env.PORT || '3001')
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
