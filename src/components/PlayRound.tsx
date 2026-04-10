import VideoDisplay from './VideoDisplay'
import GuessFeed, { type GuessEntry } from './GuessFeed'
import { Player } from '../App'

interface Props {
  word: string | null
  amDescriber: boolean
  timeLeft: number
  roundCorrect: number
  roundSkipped: number
  onSkip: () => void
  onGuess: (text: string) => void
  onClue: (text: string) => void
  guesses: GuessEntry[]
  // Video props
  localStream: MediaStream | null
  remoteStreams: Map<string, MediaStream>
  activeSpeaker: string | null
  describerId: string | null
  myId: string
  players: Player[]
  audioEnabled: boolean
  videoEnabled: boolean
  onToggleAudio: () => void
  onToggleVideo: () => void
  onRequestPermission: () => void
}

export default function PlayRound({
  word, amDescriber, timeLeft, roundCorrect, roundSkipped, onSkip, onGuess, onClue, guesses,
  localStream, remoteStreams, activeSpeaker, describerId, myId, players,
  audioEnabled, videoEnabled, onToggleAudio, onToggleVideo, onRequestPermission,
}: Props) {
  const timerClass = timeLeft <= 10 ? 'timer danger' : timeLeft <= 20 ? 'timer warning' : 'timer'
  const amOnCurrentTeam = players.find(p => p.id === myId)?.team === players.find(p => p.id === describerId)?.team

  return (
    <div className="screen play-screen-v2">
      <VideoDisplay
        localStream={localStream}
        remoteStreams={remoteStreams}
        activeSpeaker={activeSpeaker}
        describerId={describerId}
        myId={myId}
        players={players}
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        onToggleAudio={onToggleAudio}
        onToggleVideo={onToggleVideo}
        onRequestPermission={onRequestPermission}
      />

      <div className="play-header">
        <div className={timerClass}>{timeLeft}</div>
        <div className="round-live-score">
          <span className="live-correct">+{roundCorrect}</span>
          <span className="live-skip">-{roundSkipped}</span>
        </div>
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
          <button className="btn btn-skip btn-skip-full" onClick={onSkip}>
            דלג
          </button>
        </div>
      ) : null}

      <GuessFeed
        guesses={guesses}
        canGuess={!amDescriber && amOnCurrentTeam === true}
        canDescribe={amDescriber}
        onGuess={onGuess}
        onClue={onClue}
      />
    </div>
  )
}
