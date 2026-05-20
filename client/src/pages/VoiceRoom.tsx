import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  useParticipants,
  useIsSpeaking,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import type { Participant } from 'livekit-client'
import api from '../lib/api'

// Single participant tile with speaking indicator
function ParticipantCard({ participant }: { participant: Participant }) {
  const isSpeaking = useIsSpeaking(participant)
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  ).filter(t => t.participant.identity === participant.identity)

  const hasVideo = tracks.some(t => t.publication?.isSubscribed && !t.publication?.isMuted)

  return (
    <div style={{
      ...styles.participantCard,
      border: isSpeaking ? '2px solid #1D9E75' : '2px solid #2a2a30',
      boxShadow: isSpeaking ? '0 0 12px rgba(29,158,117,0.4)' : 'none',
    }}>
      {hasVideo ? (
        <video
          ref={el => {
            if (el && tracks[0]?.publication?.track) {
              tracks[0].publication.track.attach(el)
            }
          }}
          autoPlay
          muted={participant.isLocal}
          style={styles.video}
        />
      ) : (
        <div style={styles.avatarBox}>
          <div style={styles.avatar}>
            {participant.name?.charAt(0).toUpperCase() || '?'}
          </div>
        </div>
      )}
      <div style={styles.nameTag}>
        {isSpeaking && <span style={styles.speakingDot}>●</span>}
        <span>{participant.name || participant.identity}</span>
        {participant.isLocal && <span style={styles.youTag}>You</span>}
      </div>
    </div>
  )
}

// Grid of participants
function ActiveRoom() {
  const participants = useParticipants()

  return (
    <div style={styles.activeRoom}>
      {/* Participant grid — max 6 */}
      <div style={{
        ...styles.grid,
        gridTemplateColumns: participants.length <= 1
          ? '1fr'
          : participants.length <= 2
            ? '1fr 1fr'
            : participants.length <= 4
              ? '1fr 1fr'
              : '1fr 1fr 1fr',
        gridTemplateRows: participants.length <= 2
          ? '1fr'
          : participants.length <= 4
            ? '1fr 1fr'
            : '1fr 1fr',
      }}>
        {participants.slice(0, 6).map(p => (
          <ParticipantCard key={p.identity} participant={p} />
        ))}
      </div>

      {/* Participant list below */}
      <div style={styles.participantBar}>
        <span style={styles.participantBarLabel}>
          {participants.length} in room
        </span>
        <div style={styles.participantList}>
          {participants.map(p => (
            <div key={p.identity} style={styles.participantChip}>
              <div style={{
                ...styles.chipDot,
                background: p.isSpeaking ? '#1D9E75' : '#444'
              }} />
              <span>{p.name || p.identity}</span>
              {p.isLocal && <span style={styles.youBadge}>you</span>}
            </div>
          ))}
        </div>
      </div>

      <ControlBar style={styles.controlBar} />
    </div>
  )
}

export default function VoiceRoom() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [token, setToken] = useState<string | null>(null)
  const [roomName, setRoomName] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'ws://localhost:7880'

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await api.post(`/v1/rooms/${id}/token`, {})
        setToken(res.data.token)
        setRoomName(res.data.room.name)
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to join room')
      } finally {
        setLoading(false)
      }
    }
    fetchToken()
  }, [id])

  if (loading) return <div style={styles.center}>Connecting to room...</div>
  if (error) return <div style={styles.center}><p style={{ color: '#f87171' }}>{error}</p></div>
  if (!token) return null

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div style={styles.roomInfo}>
          <span style={styles.liveIndicator}>● LIVE</span>
          <span style={styles.roomName}>{roomName}</span>
        </div>
        <button style={styles.leaveBtn} onClick={() => navigate('/dashboard')}>
          Leave Room
        </button>
      </div>

      <LiveKitRoom
        token={token}
        serverUrl={LIVEKIT_URL}
        connect={true}
        audio={true}
        video={false}
        onDisconnected={() => navigate('/dashboard')}
        style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}
      >
        <RoomAudioRenderer />
        <ActiveRoom />
      </LiveKitRoom>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { height: '100vh', background: '#0f0f10', display: 'flex', flexDirection: 'column' },
  topBar: { height: 60, background: '#1a1a1e', borderBottom: '1px solid #2a2a30', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 },
  roomInfo: { display: 'flex', alignItems: 'center', gap: 12 },
  liveIndicator: { color: '#f87171', fontSize: 11, fontWeight: 700, letterSpacing: '.05em' },
  roomName: { color: '#fff', fontSize: 16, fontWeight: 600 },
  leaveBtn: { background: '#3d1515', border: '1px solid #5a2020', borderRadius: 8, padding: '7px 16px', color: '#f87171', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  activeRoom: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' },
  grid: { display: 'grid', flex: 1, gap: 8, padding: 12, overflow: 'hidden' },
  participantCard: { borderRadius: 12, overflow: 'hidden', background: '#1a1a1e', position: 'relative', transition: 'border 0.2s, box-shadow 0.2s', minHeight: 120 },
  avatarBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 120 },
  avatar: { width: 64, height: 64, borderRadius: '50%', background: '#534AB7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#fff' },
  video: { width: '100%', height: '100%', objectFit: 'cover' },
  nameTag: { position: 'absolute', bottom: 8, left: 8, right: 8, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '4px 8px', fontSize: 12, color: '#fff' },
  speakingDot: { color: '#1D9E75', fontSize: 10 },
  youTag: { marginLeft: 'auto', background: '#534AB7', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 4 },
  participantBar: { background: '#111114', borderTop: '1px solid #2a2a30', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, overflowX: 'auto' },
  participantBarLabel: { color: '#555', fontSize: 12, flexShrink: 0 },
  participantList: { display: 'flex', gap: 8, overflowX: 'auto' },
  participantChip: { display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a1e', border: '1px solid #2a2a30', borderRadius: 99, padding: '4px 10px', fontSize: 12, color: '#ccc', whiteSpace: 'nowrap' },
  chipDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  youBadge: { background: '#534AB7', color: '#fff', fontSize: 10, padding: '1px 5px', borderRadius: 4 },
  controlBar: { borderTop: '1px solid #2a2a30', flexShrink: 0 },
  center: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f10', color: '#888', fontSize: 16 },
}