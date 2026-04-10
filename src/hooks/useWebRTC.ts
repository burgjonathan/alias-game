import { useEffect, useRef, useState, useCallback } from 'react'
import type { Socket } from 'socket.io-client'

interface PeerStream {
  peerId: string
  stream: MediaStream
  audioLevel: number
}

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]

export function useWebRTC(socket: Socket, playerIds: string[], myId: string | undefined, enabled: boolean) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)

  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analysersRef = useRef<Map<string, AnalyserNode>>(new Map())

  // Get local media
  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        localStreamRef.current = stream
        setLocalStream(stream)
      })
      .catch(() => {
        // Try audio only
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          .then(stream => {
            if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
            localStreamRef.current = stream
            setLocalStream(stream)
          })
          .catch(() => {})
      })

    return () => {
      cancelled = true
      localStreamRef.current?.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
      setLocalStream(null)
    }
  }, [enabled])

  // Active speaker detection
  useEffect(() => {
    if (!enabled) return
    audioContextRef.current = new AudioContext()

    const interval = setInterval(() => {
      let maxLevel = 0
      let maxPeer: string | null = null

      analysersRef.current.forEach((analyser, peerId) => {
        const data = new Uint8Array(analyser.fftSize)
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) {
          const val = (data[i] - 128) / 128
          sum += val * val
        }
        const level = Math.sqrt(sum / data.length)
        if (level > maxLevel && level > 0.01) {
          maxLevel = level
          maxPeer = peerId
        }
      })

      setActiveSpeaker(maxPeer)
    }, 300)

    return () => {
      clearInterval(interval)
      audioContextRef.current?.close()
      audioContextRef.current = null
      analysersRef.current.clear()
    }
  }, [enabled])

  const createPeer = useCallback((peerId: string, initiator: boolean) => {
    if (!localStreamRef.current || !myId) return

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    peersRef.current.set(peerId, pc)

    // Add local tracks
    localStreamRef.current.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!)
    })

    // Handle remote tracks
    pc.ontrack = (e) => {
      const remoteStream = e.streams[0]
      if (!remoteStream) return

      setRemoteStreams(prev => new Map(prev).set(peerId, remoteStream))

      // Set up audio analyser for speaker detection
      if (audioContextRef.current && remoteStream.getAudioTracks().length > 0) {
        try {
          const source = audioContextRef.current.createMediaStreamSource(remoteStream)
          const analyser = audioContextRef.current.createAnalyser()
          analyser.fftSize = 256
          source.connect(analyser)
          analysersRef.current.set(peerId, analyser)
        } catch {}
      }
    }

    // ICE candidates
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('webrtc-ice', { to: peerId, candidate: e.candidate.toJSON() })
      }
    }

    // Create offer if initiator
    if (initiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          socket.emit('webrtc-offer', { to: peerId, offer: pc.localDescription })
        })
    }

    return pc
  }, [socket, myId])

  // Connect to peers
  useEffect(() => {
    if (!enabled || !localStream || !myId) return

    const otherPlayers = playerIds.filter(id => id !== myId)

    // Create connections to new peers (only if our ID is "greater" to avoid double-init)
    otherPlayers.forEach(peerId => {
      if (!peersRef.current.has(peerId) && myId > peerId) {
        createPeer(peerId, true)
      }
    })

    // Clean up peers that left
    peersRef.current.forEach((pc, peerId) => {
      if (!otherPlayers.includes(peerId)) {
        pc.close()
        peersRef.current.delete(peerId)
        analysersRef.current.delete(peerId)
        setRemoteStreams(prev => {
          const next = new Map(prev)
          next.delete(peerId)
          return next
        })
      }
    })
  }, [playerIds, myId, localStream, enabled, createPeer])

  // Handle WebRTC signaling events
  useEffect(() => {
    if (!enabled) return

    const handleOffer = async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      let pc = peersRef.current.get(from)
      if (!pc) {
        pc = createPeer(from, false)
        if (!pc) return
      }
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socket.emit('webrtc-answer', { to: from, answer: pc.localDescription })
    }

    const handleAnswer = async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peersRef.current.get(from)
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer))
    }

    const handleIce = async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = peersRef.current.get(from)
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate))
    }

    const handleDisconnect = ({ peerId }: { peerId: string }) => {
      const pc = peersRef.current.get(peerId)
      if (pc) {
        pc.close()
        peersRef.current.delete(peerId)
        analysersRef.current.delete(peerId)
        setRemoteStreams(prev => {
          const next = new Map(prev)
          next.delete(peerId)
          return next
        })
      }
    }

    socket.on('webrtc-offer', handleOffer)
    socket.on('webrtc-answer', handleAnswer)
    socket.on('webrtc-ice', handleIce)
    socket.on('peer-disconnected', handleDisconnect)

    return () => {
      socket.off('webrtc-offer', handleOffer)
      socket.off('webrtc-answer', handleAnswer)
      socket.off('webrtc-ice', handleIce)
      socket.off('peer-disconnected', handleDisconnect)
    }
  }, [socket, enabled, createPeer])

  // Cleanup all peers on unmount
  useEffect(() => {
    return () => {
      peersRef.current.forEach(pc => pc.close())
      peersRef.current.clear()
    }
  }, [])

  const toggleAudio = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
    setAudioEnabled(prev => !prev)
  }, [])

  const toggleVideo = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
    setVideoEnabled(prev => !prev)
  }, [])

  return { localStream, remoteStreams, activeSpeaker, audioEnabled, videoEnabled, toggleAudio, toggleVideo }
}
