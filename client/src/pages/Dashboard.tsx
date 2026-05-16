import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import toast from 'react-hot-toast'

interface Room {
  id: string
  name: string
  description: string
  createdBy: string
  createdAt: string
  user: { username: string }
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<Room[]>([])
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomDesc, setNewRoomDesc] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchRooms = async (retries = 3) => {
    try {
        const res = await api.get('/v1/rooms')
        setRooms(res.data.rooms)
    } catch (err) {
        if (retries > 0) {
        setTimeout(() => fetchRooms(retries - 1), 1000)
        } else {
        toast.error('Failed to load rooms')
        }
    }
  }

  useEffect(() => { fetchRooms() }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return
    setLoading(true)
    setError('')
    try {
        await api.post('/v1/rooms', { name: newRoomName, description: newRoomDesc })
        setNewRoomName('')
        setNewRoomDesc('')
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
    } catch (err) {
        toast.error('Failed to delete room')
    }
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
              <input
                style={styles.input}
                placeholder="Room name"
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
              />
              <input
                style={styles.input}
                placeholder="Description (optional)"
                value={newRoomDesc}
                onChange={e => setNewRoomDesc(e.target.value)}
              />
              <button style={styles.submitBtn} onClick={handleCreateRoom} disabled={loading}>
                {loading ? 'Creating...' : 'Create Room'}
              </button>
            </div>
          )}

          {/* Room List */}
          {rooms.length === 0 ? (
            <p style={styles.empty}>No rooms yet — create one to get started!</p>
          ) : (
            rooms.map(room => (
              <div key={room.id} style={styles.roomRow}>
                <div style={styles.roomInfo}>
                  <div style={styles.roomDot} />
                  <div>
                    <div style={styles.roomName}>{room.name}</div>
                    {room.description && <div style={styles.roomDesc}>{room.description}</div>}
                    <div style={styles.roomMeta}>Created by @{room.user.username}</div>
                  </div>
                </div>
                <div style={styles.roomActions}>
                  {room.createdBy === user?.id && (
                    <button style={styles.deleteBtn} onClick={() => handleDeleteRoom(room.id)}>Delete</button>
                  )}
                  <button style={styles.joinBtn} onClick={() => navigate(`/room/${room.id}`)}>
                    Join
                  </button>
                </div>
              </div>
            ))
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
  input: { background: '#1a1a1e', border: '1px solid #2a2a30', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14, outline: 'none' },
  submitBtn: { background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  error: { background: '#2d1515', border: '1px solid #5a2020', borderRadius: 8, padding: '8px 12px', color: '#f87171', fontSize: 13 },
  empty: { color: '#555', fontSize: 14, textAlign: 'center', padding: '24px 0', margin: 0 },
  roomRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #2a2a30' },
  roomInfo: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  roomDot: { width: 10, height: 10, borderRadius: '50%', background: '#1D9E75', marginTop: 5, flexShrink: 0 },
  roomName: { color: '#fff', fontSize: 14, fontWeight: 500 },
  roomDesc: { color: '#888', fontSize: 12, marginTop: 2 },
  roomMeta: { color: '#555', fontSize: 11, marginTop: 4 },
  roomActions: { display: 'flex', gap: 8, flexShrink: 0 },
  joinBtn: { background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  deleteBtn: { background: 'transparent', border: '1px solid #5a2020', borderRadius: 8, padding: '7px 12px', color: '#f87171', fontSize: 13, cursor: 'pointer' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #2a2a30' },
  rowLabel: { color: '#888', fontSize: 13 },
  rowValue: { color: '#fff', fontSize: 13, fontWeight: 500 },
}