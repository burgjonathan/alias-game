import { useEffect, useRef } from 'react'
import { Player, TEAM_COLORS } from '../App'

interface Props {
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
}

function VideoTile({ stream, muted, label, highlight }: {
  stream: MediaStream | null
  muted: boolean
  label: string
  highlight?: boolean
}) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream
    }
  }, [stream])

  const hasVideo = stream?.getVideoTracks().some(t => t.enabled) ?? false

  return (
    <div className={`video-tile ${highlight ? 'video-tile-active' : ''}`}>
      {stream && hasVideo ? (
        <video ref={ref} autoPlay playsInline muted={muted} />
      ) : (
        <div className="video-placeholder">{label[0]}</div>
      )}
      <span className="video-label">{label}</span>
    </div>
  )
}

export default function VideoDisplay({
  localStream, remoteStreams, activeSpeaker, describerId, myId, players,
  audioEnabled, videoEnabled, onToggleAudio, onToggleVideo,
}: Props) {
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name ?? '?'

  // Determine which 2 tiles to show: describer + active speaker
  const tiles: { id: string; stream: MediaStream | null; label: string; muted: boolean; highlight: boolean }[] = []

  // Always show describer
  if (describerId) {
    const isMe = describerId === myId
    tiles.push({
      id: describerId,
      stream: isMe ? localStream : remoteStreams.get(describerId) ?? null,
      label: isMe ? `${getPlayerName(describerId)} (את/ה)` : getPlayerName(describerId),
      muted: isMe,
      highlight: false,
    })
  }

  // Show active speaker if different from describer
  if (activeSpeaker && activeSpeaker !== describerId) {
    const isMe = activeSpeaker === myId
    tiles.push({
      id: activeSpeaker,
      stream: isMe ? localStream : remoteStreams.get(activeSpeaker) ?? null,
      label: isMe ? `${getPlayerName(activeSpeaker)} (את/ה)` : getPlayerName(activeSpeaker),
      muted: isMe,
      highlight: true,
    })
  }

  // If no active speaker, show self (if not already shown as describer)
  if (tiles.length < 2 && !tiles.some(t => t.id === myId)) {
    tiles.push({
      id: myId,
      stream: localStream,
      label: `${getPlayerName(myId)} (את/ה)`,
      muted: true,
      highlight: false,
    })
  }

  return (
    <div className="video-display">
      <div className="video-tiles">
        {tiles.map(tile => (
          <VideoTile
            key={tile.id}
            stream={tile.stream}
            muted={tile.muted}
            label={tile.label}
            highlight={tile.highlight}
          />
        ))}
      </div>
      <div className="video-controls">
        <button
          className={`video-control-btn ${!audioEnabled ? 'off' : ''}`}
          onClick={onToggleAudio}
        >
          {audioEnabled ? '🎤' : '🔇'}
        </button>
        <button
          className={`video-control-btn ${!videoEnabled ? 'off' : ''}`}
          onClick={onToggleVideo}
        >
          {videoEnabled ? '📹' : '📷'}
        </button>
      </div>
    </div>
  )
}
