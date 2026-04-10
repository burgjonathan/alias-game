import { shuffleWords } from './words.js'

export interface Player {
  id: string
  name: string
  team: 0 | 1 | null
  isHost: boolean
}

export type Phase = 'lobby' | 'game' | 'playing' | 'summary' | 'gameover'

export interface Room {
  id: string
  code: string
  isPublic: boolean
  host: string
  players: Player[]
  game: {
    positions: [number, number]
    currentTeam: 0 | 1
    words: string[]
    wordIndex: number
    roundCorrect: number
    roundSkipped: number
    describerIndex: [number, number] // per-team rotation index
    describerId: string | null
    phase: Phase
    timerInterval?: ReturnType<typeof setInterval>
    timeLeft: number
  }
}

const BOARD_SIZE = 40

const rooms = new Map<string, Room>()
const codeToRoom = new Map<string, string>()

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return codeToRoom.has(code) ? generateCode() : code
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

export function createRoom(hostId: string, hostName: string, isPublic: boolean): Room {
  const id = generateId()
  const code = generateCode()
  const room: Room = {
    id,
    code,
    isPublic,
    host: hostId,
    players: [{ id: hostId, name: hostName, team: null, isHost: true }],
    game: {
      positions: [0, 0],
      currentTeam: 0,
      words: shuffleWords(),
      wordIndex: 0,
      roundCorrect: 0,
      roundSkipped: 0,
      describerIndex: [0, 0],
      describerId: null,
      phase: 'lobby',
      timeLeft: 60,
    },
  }
  rooms.set(id, room)
  codeToRoom.set(code, id)
  return room
}

export function findPublicRoom(): Room | null {
  for (const room of rooms.values()) {
    if (room.isPublic && room.game.phase === 'lobby' && room.players.length < 10) {
      return room
    }
  }
  return null
}

export function joinRoom(roomId: string, playerId: string, playerName: string): Room | null {
  const room = rooms.get(roomId)
  if (!room) return null
  if (room.players.find(p => p.id === playerId)) return room
  room.players.push({ id: playerId, name: playerName, team: null, isHost: false })
  return room
}

export function getRoomByCode(code: string): Room | null {
  const roomId = codeToRoom.get(code.toUpperCase())
  return roomId ? rooms.get(roomId) ?? null : null
}

export function getRoom(roomId: string): Room | null {
  return rooms.get(roomId) ?? null
}

export function setPlayerTeam(room: Room, playerId: string, team: 0 | 1): void {
  const player = room.players.find(p => p.id === playerId)
  if (player) player.team = team
}

export function setPlayerName(room: Room, playerId: string, name: string): void {
  const player = room.players.find(p => p.id === playerId)
  if (player) player.name = name
}

export function removePlayer(roomId: string, playerId: string): Room | null {
  const room = rooms.get(roomId)
  if (!room) return null
  room.players = room.players.filter(p => p.id !== playerId)

  if (room.players.length === 0) {
    if (room.game.timerInterval) clearInterval(room.game.timerInterval)
    rooms.delete(roomId)
    codeToRoom.delete(room.code)
    return null
  }

  // Transfer host
  if (room.host === playerId) {
    room.host = room.players[0].id
    room.players[0].isHost = true
  }
  return room
}

export function getTeamPlayers(room: Room, team: 0 | 1): Player[] {
  return room.players.filter(p => p.team === team)
}

export function canStartGame(room: Room): boolean {
  const team0 = getTeamPlayers(room, 0)
  const team1 = getTeamPlayers(room, 1)
  return team0.length >= 2 && team1.length >= 2
}

export function startGame(room: Room): void {
  room.game.phase = 'game'
  room.game.positions = [0, 0]
  room.game.currentTeam = 0
  room.game.words = shuffleWords()
  room.game.wordIndex = 0
  room.game.roundCorrect = 0
  room.game.roundSkipped = 0
  room.game.describerIndex = [0, 0]
  room.game.describerId = null
}

export function startRound(room: Room): string | null {
  const team = room.game.currentTeam
  const teamPlayers = getTeamPlayers(room, team)
  if (teamPlayers.length === 0) return null

  const idx = room.game.describerIndex[team] % teamPlayers.length
  const describer = teamPlayers[idx]

  room.game.phase = 'playing'
  room.game.roundCorrect = 0
  room.game.roundSkipped = 0
  room.game.describerId = describer.id
  room.game.timeLeft = 60

  return describer.id
}

export function getCurrentWord(room: Room): string {
  if (room.game.wordIndex >= room.game.words.length) {
    room.game.words = shuffleWords()
    room.game.wordIndex = 0
  }
  return room.game.words[room.game.wordIndex]
}

// Normalize Hebrew text for comparison: strip nikud, trim, lowercase
export function normalizeWord(w: string): string {
  return w
    .replace(/[\u0591-\u05C7]/g, '') // strip nikud/cantillation
    .replace(/['"״׳]/g, '')          // strip quotes
    .trim()
    .toLowerCase()
}

export function checkGuess(room: Room, guess: string): boolean {
  const word = getCurrentWord(room)
  return normalizeWord(guess) === normalizeWord(word)
}

export function wordCorrect(room: Room): void {
  room.game.roundCorrect++
  room.game.wordIndex++
}

export function wordSkip(room: Room): void {
  room.game.roundSkipped++
  room.game.wordIndex++
}

export function endRound(room: Room): void {
  if (room.game.timerInterval) {
    clearInterval(room.game.timerInterval)
    room.game.timerInterval = undefined
  }

  const team = room.game.currentTeam
  const net = room.game.roundCorrect - room.game.roundSkipped
  room.game.positions[team] = Math.max(0, Math.min(BOARD_SIZE, room.game.positions[team] + net))
  room.game.phase = 'summary'
}

export function nextTurn(room: Room): void {
  const team = room.game.currentTeam
  if (room.game.positions[team] >= BOARD_SIZE) {
    room.game.phase = 'gameover'
    return
  }

  // Rotate describer for current team
  room.game.describerIndex[team]++
  // Switch team
  room.game.currentTeam = team === 0 ? 1 : 0
  room.game.describerId = null
  room.game.phase = 'game'
}

export function resetGame(room: Room): void {
  room.game.phase = 'lobby'
  room.game.positions = [0, 0]
  room.game.currentTeam = 0
  room.game.words = shuffleWords()
  room.game.wordIndex = 0
  room.game.roundCorrect = 0
  room.game.roundSkipped = 0
  room.game.describerIndex = [0, 0]
  room.game.describerId = null
  // Reset teams
  room.players.forEach(p => { p.team = null })
}
