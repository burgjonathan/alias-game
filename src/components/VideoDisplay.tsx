import { useEffect, useRef, useCallback } from 'react'
import { Player } from '../App'

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
  onRequestPermission: () => void
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

function useLongPress(onLongPress: () => void, onClick: () => void, ms = 600) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firedRef = useRef(false)

  const start = useCallback(() => {
    firedRef.current = false
    timerRef.current = setTimeout(() => {
      firedRef.current = true
      onLongPress()
    }, ms)
  }, [onLongPress, ms])

  const end = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!firedRef.current) {
      onClick()
    }
  }, [onClick])

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  return {
    onMouseDown: start,
    onMouseUp: end,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: end,
    onTouchCancel: cancel,
  }
}

export default function VideoDisplay({
  localStream, remoteStreams, activeSpeaker, describerId, myId, players,
  audioEnabled, videoEnabled, onToggleAudio, onToggleVideo, onRequestPermission,
}: Props) {
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name ?? '?'

  const micPress = useLongPress(onRequestPermission, onToggleAudio)
  const camPress = useLongPress(onRequestPermission, onToggleVideo)

  const tiles: { id: string; stream: MediaStream | null; label: string; muted: boolean; highlight: boolean }[] = []

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
          {...micPress}
          onClick={undefined}
        >
          {audioEnabled ? '🎤' : '🔇'}
        </button>
        <button
          className={`video-control-btn ${!videoEnabled ? 'off' : ''}`}
          {...camPress}
          onClick={undefined}
        >
          {videoEnabled ? '📹' : '📷'}
        </button>
      </div>
    </div>
  )
}
