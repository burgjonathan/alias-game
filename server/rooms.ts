import { shuffleWords } from './words.js'

export type TeamIdx = 0 | 1 | 2 | 3

export interface Player {
  id: string
  name: string
  team: TeamIdx | null
  isHost: boolean
}

export type Phase = 'lobby' | 'game' | 'playing' | 'summary' | 'gameover'

export type LobbyTimerKind = 'start' | 'rebalance' | 'autoassign'

export interface LobbyTimer {
  kind: LobbyTimerKind
  secondsLeft: number
  intervalId: ReturnType<typeof setInterval>
}

export interface Room {
  id: string
  code: string
  isPublic: boolean
  host: string
  numTeams: number
  players: Player[]
  game: {
    positions: number[]
    currentTeam: number
    words: string[]
    wordIndex: number
    roundCorrect: number
    roundSkipped: number
    describerIndex: number[]
    describerId: string | null
    phase: Phase
    timerInterval?: ReturnType<typeof setInterval>
    timeLeft: number
  }
  lobbyTimer: LobbyTimer | null
}

export const BOARD_SIZE = 40
export const MAX_TEAMS = 4
export const MAX_PLAYERS_PER_TEAM = 4
export const MIN_PLAYERS_PER_TEAM = 2
export const START_COUNTDOWN_SECONDS = 10
export const REBALANCE_SECONDS = 20
export const AUTOASSIGN_SECONDS = 20

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
  const numTeams = 2
  const room: Room = {
    id,
    code,
    isPublic,
    host: hostId,
    numTeams,
    players: [{ id: hostId, name: hostName, team: null, isHost: true }],
    game: {
      positions: Array(numTeams).fill(0),
      currentTeam: 0,
      words: shuffleWords(),
      wordIndex: 0,
      roundCorrect: 0,
      roundSkipped: 0,
      describerIndex: Array(numTeams).fill(0),
      describerId: null,
      phase: 'lobby',
      timeLeft: 60,
    },
    lobbyTimer: null,
  }
  rooms.set(id, room)
  codeToRoom.set(code, id)
  return room
}

export function findPublicRoom(): Room | null {
  for (const room of rooms.values()) {
    if (
      room.isPublic &&
      room.game.phase === 'lobby' &&
      room.players.length < MAX_TEAMS * MAX_PLAYERS_PER_TEAM
    ) {
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

function teamSizes(room: Room): number[] {
  const sizes = Array(room.numTeams).fill(0)
  for (const p of room.players) {
    if (p.team !== null && p.team < room.numTeams) sizes[p.team]++
  }
  return sizes
}

function ensureTeamCapacity(room: Room, n: number): void {
  while (room.numTeams < n) {
    room.game.positions.push(0)
    room.game.describerIndex.push(0)
    room.numTeams++
  }
}

// Return true on success. team may be 0..numTeams (numTeams = create new team).
export function setPlayerTeam(room: Room, playerId: string, team: number): boolean {
  const player = room.players.find(p => p.id === playerId)
  if (!player) return false
  if (team < 0 || team > MAX_TEAMS - 1) return false

  if (team >= room.numTeams) {
    if (room.numTeams >= MAX_TEAMS) return false
    ensureTeamCapacity(room, team + 1)
  }

  // Cap check
  const sizes = teamSizes(room)
  if (player.team !== team && sizes[team] >= MAX_PLAYERS_PER_TEAM) return false

  player.team = team as TeamIdx
  return true
}

// Public-mode auto-assign: smallest team wins; if all at cap, create new team.
export function assignToBalancedTeam(room: Room, playerId: string): boolean {
  const player = room.players.find(p => p.id === playerId)
  if (!player) return false

  const sizes = teamSizes(room)
  const minSize = Math.min(...sizes)

  if (minSize >= MAX_PLAYERS_PER_TEAM) {
    if (room.numTeams >= MAX_TEAMS) return false
    ensureTeamCapacity(room, room.numTeams + 1)
    player.team = (room.numTeams - 1) as TeamIdx
    return true
  }

  player.team = sizes.indexOf(minSize) as TeamIdx
  return true
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
    if (room.lobbyTimer) clearInterval(room.lobbyTimer.intervalId)
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

export function getTeamPlayers(room: Room, team: number): Player[] {
  return room.players.filter(p => p.team === team)
}

// Empty out unused trailing teams (no players, not the first 2).
export function compactEmptyTeams(room: Room): void {
  while (room.numTeams > 2) {
    const last = room.numTeams - 1
    if (room.players.some(p => p.team === last)) break
    room.numTeams--
    room.game.positions.pop()
    room.game.describerIndex.pop()
  }
}

export function isLobbyBalanced(room: Room): boolean {
  const sizes = teamSizes(room)
  if (sizes.length < 2) return false
  const filledTeams = sizes.filter(s => s > 0).length
  if (filledTeams < 2) return false
  // All non-empty teams must be the same size and >= MIN_PLAYERS_PER_TEAM,
  // and there must be no empty trailing teams.
  if (sizes.some(s => s === 0)) return false
  const first = sizes[0]
  if (first < MIN_PLAYERS_PER_TEAM) return false
  return sizes.every(s => s === first)
}

export function hasMinimumToPlay(room: Room): boolean {
  const sizes = teamSizes(room)
  const teamsWithEnough = sizes.filter(s => s >= MIN_PLAYERS_PER_TEAM).length
  return teamsWithEnough >= 2
}

// Private-room start gate: ≥2 teams have ≥MIN players, all non-empty teams have ≥MIN
export function canStartGame(room: Room): boolean {
  const sizes = teamSizes(room)
  if (sizes.filter(s => s > 0).length < 2) return false
  if (sizes.some(s => s > 0 && s < MIN_PLAYERS_PER_TEAM)) return false
  if (sizes.filter(s => s >= MIN_PLAYERS_PER_TEAM).length < 2) return false
  if (room.players.some(p => p.team === null)) return false
  return true
}

// Compute the best (numTeams, perTeam) split for a given player count.
function bestSplit(total: number): { nt: number; pt: number } | null {
  let best: { nt: number; pt: number } | null = null
  for (let nt = 2; nt <= MAX_TEAMS; nt++) {
    if (total % nt !== 0) continue
    const pt = total / nt
    if (pt < MIN_PLAYERS_PER_TEAM || pt > MAX_PLAYERS_PER_TEAM) continue
    // Prefer larger perTeam (more meaningful teams).
    if (!best || pt > best.pt) best = { nt, pt }
  }
  return best
}

export function tryRebalance(room: Room): boolean {
  const total = room.players.length
  const best = bestSplit(total)
  if (!best) return false

  // Order players: keep the largest existing team's players first (they stay together),
  // unassigned players last.
  const groups = new Map<number, Player[]>()
  for (const p of room.players) {
    const key = p.team ?? -1
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  }

  const ordered: Player[] = Array.from(groups.entries())
    .sort((a, b) => {
      if (a[0] === -1) return 1
      if (b[0] === -1) return -1
      return b[1].length - a[1].length
    })
    .flatMap(([, ps]) => ps)

  // Resize team count and zero positions
  while (room.numTeams > best.nt) {
    room.numTeams--
    room.game.positions.pop()
    room.game.describerIndex.pop()
  }
  ensureTeamCapacity(room, best.nt)

  ordered.forEach((p, i) => {
    p.team = Math.floor(i / best.pt) as TeamIdx
  })
  return true
}

export function autoAssignUnassigned(room: Room): void {
  const unassigned = room.players.filter(p => p.team === null)
  for (const p of unassigned) {
    assignToBalancedTeam(room, p.id)
  }
}

export function startGame(room: Room): void {
  if (room.lobbyTimer) {
    clearInterval(room.lobbyTimer.intervalId)
    room.lobbyTimer = null
  }
  // Drop empty teams so the game runs only over teams with players.
  const sizes = teamSizes(room)
  if (sizes.some(s => s === 0)) {
    const remap = new Map<number, number>()
    let next = 0
    for (let i = 0; i < room.numTeams; i++) {
      if (sizes[i] > 0) remap.set(i, next++)
    }
    for (const p of room.players) {
      if (p.team !== null && remap.has(p.team)) {
        p.team = remap.get(p.team)! as TeamIdx
      }
    }
    room.numTeams = next
    room.game.positions = Array(next).fill(0)
    room.game.describerIndex = Array(next).fill(0)
  } else {
    room.game.positions = Array(room.numTeams).fill(0)
    room.game.describerIndex = Array(room.numTeams).fill(0)
  }

  room.game.phase = 'game'
  room.game.currentTeam = 0
  room.game.words = shuffleWords()
  room.game.wordIndex = 0
  room.game.roundCorrect = 0
  room.game.roundSkipped = 0
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
    .replace(/[֑-ׇ]/g, '') // strip nikud/cantillation
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

  room.game.describerIndex[team]++
  room.game.currentTeam = (team + 1) % room.numTeams
  room.game.describerId = null
  room.game.phase = 'game'
}

export function resetGame(room: Room): void {
  room.game.phase = 'lobby'
  room.game.currentTeam = 0
  room.game.words = shuffleWords()
  room.game.wordIndex = 0
  room.game.roundCorrect = 0
  room.game.roundSkipped = 0
  room.game.describerId = null
  // Reset team count to 2 and clear assignments.
  room.numTeams = 2
  room.game.positions = [0, 0]
  room.game.describerIndex = [0, 0]
  room.players.forEach(p => { p.team = null })
}
