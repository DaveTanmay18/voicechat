import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  GridLayout,
  ParticipantTile,
  useTracks,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import api from '../lib/api'

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'ws://localhost:7880'

function ActiveRoom() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  )

  return (
    <div style={styles.roomLayout}>
      <GridLayout tracks={tracks} style={{ height: 'calc(100vh - 140px)' }}>
        <ParticipantTile />
      </GridLayout>
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
        style={{ height: 'calc(100vh - 60px)' }}
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
  roomLayout: { display: 'flex', flexDirection: 'column', height: '100%' },
  controlBar: { borderTop: '1px solid #2a2a30' },
  center: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f10', color: '#888', fontSize: 16 },
}