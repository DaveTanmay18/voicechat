import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import toast from 'react-hot-toast'

interface Room {
  id: string
  name: string
  description: string
  type: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY'
  createdBy: string
  createdAt: string
  user: { username: string }
  _count: { members: number }
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<Room[]>([])
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomDesc, setNewRoomDesc] = useState('')
  const [newRoomType, setNewRoomType] = useState<'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY'>('PUBLIC')
  const [newRoomPassword, setNewRoomPassword] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [joinPasswordModal, setJoinPasswordModal] = useState<{ roomId: string, roomName: string } | null>(null)
  const [joinPassword, setJoinPassword] = useState('')

  const fetchRooms = async (retries = 3) => {
    try {
      const res = await api.get('/v1/rooms')
      setRooms(res.data.rooms)
    } catch (err) {
      if (retries > 0) setTimeout(() => fetchRooms(retries - 1), 1000)
      else toast.error('Failed to load rooms')
    }
  }

  useEffect(() => { fetchRooms() }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return
    if (newRoomType === 'PRIVATE' && !newRoomPassword.trim()) {
      toast.error('Password is required for private rooms')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.post('/v1/rooms', {
        name: newRoomName,
        description: newRoomDesc,
        type: newRoomType,
        password: newRoomType === 'PRIVATE' ? newRoomPassword : undefined
      })
      setNewRoomName('')
      setNewRoomDesc('')
      setNewRoomType('PUBLIC')
      setNewRoomPassword('')
      setShowForm(false)
      toast.success('Room created!')
      fetchRooms()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create room')
      toast.error(err.response?.data?.error || 'Failed to create room')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRoom = async (id: string) => {
    try {
      await api.delete(`/v1/rooms/${id}`)
      toast.success('Room deleted')
      fetchRooms()
    } catch {
      toast.error('Failed to delete room')
    }
  }

  const handleJoinRoom = async (room: Room) => {
    if (room.type === 'PRIVATE') {
      setJoinPasswordModal({ roomId: room.id, roomName: room.name })
      return
    }
    if (room.type === 'INVITE_ONLY' && room.createdBy !== user?.id) {
      toast.error('This room is invite only')
      return
    }
    try {
      await api.post(`/v1/rooms/${room.id}/join`, {})
    } catch { /* already member is fine */ }
    navigate(`/room/${room.id}`)
  }

  const handleJoinPrivate = async () => {
    if (!joinPasswordModal) return
    try {
      await api.post(`/v1/rooms/${joinPasswordModal.roomId}/join`, { password: joinPassword })
      setJoinPasswordModal(null)
      setJoinPassword('')
      navigate(`/room/${joinPasswordModal.roomId}`)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Incorrect password')
    }
  }

  const handleInvite = async (room: Room) => {
    try {
      const res = await api.post(`/v1/rooms/${room.id}/invite`, {})
      window.open(res.data.whatsappLink, '_blank')
      toast.success('WhatsApp invite opened!')
    } catch {
      toast.error('Failed to generate invite link')
    }
  }

  const getRoomIcon = (type: string) => {
    if (type === 'PRIVATE') return '🔒'
    if (type === 'INVITE_ONLY') return '🔑'
    return '🌐'
  }

  const getRoomTypeBadge = (type: string) => {
    if (type === 'PRIVATE') return { label: 'Private', color: '#f87171', bg: '#2d1515' }
    if (type === 'INVITE_ONLY') return { label: 'Invite Only', color: '#FAC775', bg: '#2d2015' }
    return { label: 'Public', color: '#1D9E75', bg: '#0d2d1f' }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>VoiceChat</h1>
            <p style={styles.subtitle}>Welcome back, <span style={styles.username}>@{user?.username}</span></p>
          </div>
          <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>

        {/* Voice Rooms */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>🎙️ Voice Rooms</h2>
            <button style={styles.createBtn} onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : '+ New Room'}
            </button>
          </div>

          {/* Create Room Form */}
          {showForm && (
            <div style={styles.form}>
              {error && <div style={styles.error}>{error}</div>}
              <input style={styles.input} placeholder="Room name" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} />
              <input style={styles.input} placeholder="Description (optional)" value={newRoomDesc} onChange={e => setNewRoomDesc(e.target.value)} />
              <div style={styles.field}>
                <label style={styles.label}>Room type</label>
                <select style={styles.select} value={newRoomType} onChange={e => setNewRoomType(e.target.value as any)}>
                  <option value="PUBLIC">🌐 Public — anyone can join</option>
                  <option value="PRIVATE">🔒 Private — password required</option>
                  <option value="INVITE_ONLY">🔑 Invite Only — invite link required</option>
                </select>
              </div>
              {newRoomType === 'PRIVATE' && (
                <input style={styles.input} type="password" placeholder="Room password" value={newRoomPassword} onChange={e => setNewRoomPassword(e.target.value)} />
              )}
              <button style={styles.submitBtn} onClick={handleCreateRoom} disabled={loading}>
                {loading ? 'Creating...' : 'Create Room'}
              </button>
            </div>
          )}

          {/* Room List */}
          {rooms.length === 0 ? (
            <p style={styles.empty}>No rooms yet — create one to get started!</p>
          ) : (
            rooms.map(room => {
              const badge = getRoomTypeBadge(room.type)
              return (
                <div key={room.id} style={styles.roomRow}>
                  <div style={styles.roomInfo}>
                    <span style={{ fontSize: 20 }}>{getRoomIcon(room.type)}</span>
                    <div>
                      <div style={styles.roomNameRow}>
                        <span style={styles.roomName}>{room.name}</span>
                        <span style={{ ...styles.badge, color: badge.color, background: badge.bg }}>{badge.label}</span>
                      </div>
                      {room.description && <div style={styles.roomDesc}>{room.description}</div>}
                      <div style={styles.roomMeta}>By @{room.user.username} · {room._count.members} member{room._count.members !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  <div style={styles.roomActions}>
                    {room.createdBy === user?.id && (
                      <>
                        <button style={styles.inviteBtn} onClick={() => handleInvite(room)} title="Invite via WhatsApp">📲</button>
                        <button style={styles.deleteBtn} onClick={() => handleDeleteRoom(room.id)}>Delete</button>
                      </>
                    )}
                    <button style={styles.joinBtn} onClick={() => handleJoinRoom(room)}>Join</button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Profile */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Your Profile</h2>
          <div style={styles.row}>
            <span style={styles.rowLabel}>Username</span>
            <span style={styles.rowValue}>@{user?.username}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.rowLabel}>Email</span>
            <span style={styles.rowValue}>{user?.email}</span>
          </div>
        </div>

      </div>

      {/* Join Private Room Modal */}
      {joinPasswordModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>🔒 Enter Room Password</h3>
            <p style={styles.modalDesc}>"{joinPasswordModal.roomName}" is a private room</p>
            <input
              style={styles.input}
              type="password"
              placeholder="Room password"
              value={joinPassword}
              onChange={e => setJoinPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoinPrivate()}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button style={styles.cancelBtn} onClick={() => { setJoinPasswordModal(null); setJoinPassword('') }}>Cancel</button>
              <button style={styles.submitBtn} onClick={handleJoinPrivate}>Join Room</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0f0f10', padding: '0 16px' },
  container: { maxWidth: 680, margin: '0 auto', paddingTop: 48 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 },
  title: { color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 },
  subtitle: { color: '#888', fontSize: 14, margin: '4px 0 0' },
  username: { color: '#7C74E0', fontWeight: 600 },
  logoutBtn: { background: 'transparent', border: '1px solid #2a2a30', borderRadius: 8, padding: '8px 16px', color: '#888', fontSize: 13, cursor: 'pointer' },
  card: { background: '#1a1a1e', border: '1px solid #2a2a30', borderRadius: 16, padding: 24, marginBottom: 16 },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: 600, margin: 0 },
  createBtn: { background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  form: { background: '#111114', border: '1px solid #2a2a30', borderRadius: 10, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { color: '#888', fontSize: 12 },
  input: { background: '#1a1a1e', border: '1px solid #2a2a30', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14, outline: 'none' },
  select: { background: '#1a1a1e', border: '1px solid #2a2a30', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14, outline: 'none' },
  submitBtn: { background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  error: { background: '#2d1515', border: '1px solid #5a2020', borderRadius: 8, padding: '8px 12px', color: '#f87171', fontSize: 13 },
  empty: { color: '#555', fontSize: 14, textAlign: 'center', padding: '24px 0', margin: 0 },
  roomRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #2a2a30' },
  roomInfo: { display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 },
  roomNameRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  roomName: { color: '#fff', fontSize: 14, fontWeight: 500 },
  badge: { fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 500 },
  roomDesc: { color: '#888', fontSize: 12, marginTop: 2 },
  roomMeta: { color: '#555', fontSize: 11, marginTop: 4 },
  roomActions: { display: 'flex', gap: 8, flexShrink: 0 },
  joinBtn: { background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  deleteBtn: { background: 'transparent', border: '1px solid #5a2020', borderRadius: 8, padding: '7px 12px', color: '#f87171', fontSize: 13, cursor: 'pointer' },
  inviteBtn: { background: 'transparent', border: '1px solid #2a2a30', borderRadius: 8, padding: '7px 10px', fontSize: 16, cursor: 'pointer' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #2a2a30' },
  rowLabel: { color: '#888', fontSize: 13 },
  rowValue: { color: '#fff', fontSize: 13, fontWeight: 500 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#1a1a1e', border: '1px solid #2a2a30', borderRadius: 16, padding: '32px', width: '100%', maxWidth: 360 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 600, margin: '0 0 8px' },
  modalDesc: { color: '#888', fontSize: 13, margin: '0 0 16px' },
  cancelBtn: { flex: 1, background: 'transparent', border: '1px solid #2a2a30', borderRadius: 8, padding: '10px', fontSize: 14, color: '#888', cursor: 'pointer' },
}