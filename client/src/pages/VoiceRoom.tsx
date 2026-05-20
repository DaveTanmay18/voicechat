import { useEffect, useState, useRef } from 'react'
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
import { io, Socket } from 'socket.io-client'
import api from '../lib/api'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

interface ChatMessage {
  id: string
  username: string
  content: string
  timestamp: number
}

function ParticipantCard({ participant, isMobile, count }: { participant: Participant, isMobile: boolean, count: number }) {
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
      minHeight: isMobile && count === 2 ? '45vh' : isMobile ? 160 : 0,
      height: isMobile && count === 2 ? '45vh' : isMobile ? 160 : 'auto',
    }}>
      {hasVideo ? (
        <video
          ref={el => { if (el && tracks[0]?.publication?.track) tracks[0].publication.track.attach(el) }}
          autoPlay
          muted={participant.isLocal}
          style={styles.video}
        />
      ) : (
        <div style={styles.avatarBox}>
          <div style={styles.avatar}>{participant.name?.charAt(0).toUpperCase() || '?'}</div>
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

function ActiveRoom({ roomId, username }: { roomId: string, username: string }) {
  const participants = useParticipants()
  const count = participants.length
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [unread, setUnread] = useState(0)
  const socketRef = useRef<Socket | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const socket = io(SOCKET_URL, { auth: { token } })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join-room', { roomId, username })
    })

    socket.on('message-history', (msgs: ChatMessage[]) => {
      setMessages(msgs)
    })

    socket.on('new-message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg])
      if (!showChat) setUnread(prev => prev + 1)
    })

    return () => {
      socket.emit('leave-room', { roomId })
      socket.disconnect()
    }
  }, [roomId, username])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (showChat) setUnread(0)
  }, [showChat])

  const sendMessage = () => {
    if (!input.trim() || !socketRef.current) return
    socketRef.current.emit('send-message', { roomId, content: input })
    setInput('')
  }

  const getGridStyle = (): React.CSSProperties => {
    const isMobile = windowWidth <= 768

    if (isMobile) {
        if (count <= 1) return { gridTemplateColumns: '1fr', gridTemplateRows: '1fr' }
        if (count === 2) return { gridTemplateColumns: '1fr', gridTemplateRows: '1fr 1fr' }
        if (count <= 4) return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }
        return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr 1fr' }
    }

    // Desktop
    if (count <= 1) return { gridTemplateColumns: '1fr', gridTemplateRows: '1fr' }
    if (count === 2) return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr' }
    if (count <= 4) return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }
    return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr 1fr' }
  }

  return (
    <div style={styles.activeRoom}>
      <div style={styles.mainArea}>
        {/* Voice grid */}
        <div style={{ ...styles.voiceArea, width: showChat ? '60%' : '100%' }}>
          <div style={{ ...styles.grid, ...getGridStyle(), alignContent: count === 2 && windowWidth <= 768 ? 'stretch' : 'start' }}>
            {participants.slice(0, 6).map(p => (
                <ParticipantCard key={p.identity} participant={p} isMobile={windowWidth <= 768} count={count} />
            ))}
          </div>

          {/* Participant bar */}
          {/* <div style={styles.participantBar}>
            <span style={styles.participantBarLabel}>{count} in room</span>
            <div style={styles.participantList}>
              {participants.map(p => (
                <div key={p.identity} style={styles.participantChip}>
                  <div style={{ ...styles.chipDot, background: p.isSpeaking ? '#1D9E75' : '#444' }} />
                  <span>{p.name || p.identity}</span>
                  {p.isLocal && <span style={styles.youBadge}>you</span>}
                </div>
              ))}
            </div>
          </div> */}
        </div>

        {/* Chat panel */}
        {showChat && (
          <div style={styles.chatPanel}>
            <div style={styles.chatHeader}>
              <span style={styles.chatTitle}>💬 Chat</span>
              <button style={styles.closeChatBtn} onClick={() => setShowChat(false)}>✕</button>
            </div>
            <div style={styles.messageList}>
              {messages.length === 0 && (
                <p style={styles.noMessages}>No messages yet. Say hi! 👋</p>
              )}
              {messages.map(msg => {
  const isOwn = msg.username === username
  return (
    <div key={msg.id} style={{
      ...styles.messageItem,
      alignSelf: isOwn ? 'flex-start' : 'flex-end',
      alignItems: isOwn ? 'flex-start' : 'flex-end',
    }}>
      <div style={styles.messageMeta}>
        {isOwn && <span style={{ ...styles.messageUsername, color: '#7C74E0' }}>You</span>}
        {!isOwn && <span style={{ ...styles.messageUsername, color: '#1D9E75' }}>{msg.username}</span>}
        <span style={styles.messageTime}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div style={{
        ...styles.messageBubble,
        background: isOwn ? '#1a1a1e' : '#534AB7',
        borderRadius: isOwn ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
      }}>
        {msg.content}
      </div>
    </div>
  )
})}
              <div ref={chatEndRef} />
            </div>
            <div style={styles.chatInput}>
              <input
                style={styles.chatInputField}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                maxLength={500}
              />
              <button style={styles.sendBtn} onClick={sendMessage}>➤</button>
            </div>
          </div>
        )}
      </div>

      <div style={styles.bottomBar}>
        <ControlBar style={styles.controlBar} />
        <button
          style={{ ...styles.chatToggleBtn, background: unread > 0 ? '#534AB7' : '#1a1a1e' }}
          onClick={() => setShowChat(!showChat)}
        >
          💬 Chat {unread > 0 && <span style={styles.unreadBadge}>{unread}</span>}
        </button>
      </div>
    </div>
  )
}

export default function VoiceRoom() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [token, setToken] = useState<string | null>(null)
  const [roomName, setRoomName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'ws://localhost:7880'

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await api.post(`/v1/rooms/${id}/token`, {})
        setToken(res.data.token)
        setRoomName(res.data.room.name)
        const savedUser = localStorage.getItem('user')
        if (savedUser) setUsername(JSON.parse(savedUser).username)
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
        <button style={styles.leaveBtn} onClick={() => navigate('/dashboard')}>Leave Room</button>
      </div>
      <LiveKitRoom
        token={token}
        serverUrl={LIVEKIT_URL}
        connect={true}
        audio={true}
        video={false}
        onDisconnected={() => navigate('/dashboard')}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <RoomAudioRenderer />
        <ActiveRoom roomId={id!} username={username} />
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
  mainArea: { display: 'flex', flex: 1, overflow: 'hidden' },
  voiceArea: { display: 'flex', flexDirection: 'column', transition: 'width 0.3s', overflow: 'hidden' },
  grid: { display: 'grid', flex: 1, gap: 6, padding: 8, overflowY: 'auto', overflowX: 'hidden', alignContent: 'start' },
  participantCard: { borderRadius: 12, overflow: 'hidden', background: '#1a1a1e', position: 'relative', transition: 'border 0.2s, box-shadow 0.2s' },
  avatarBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 80 },
  avatar: { width: 56, height: 56, borderRadius: '50%', background: '#534AB7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff' },
  video: { width: '100%', height: '100%', objectFit: 'cover' },
  nameTag: { position: 'absolute', bottom: 8, left: 8, right: 8, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '4px 8px', fontSize: 12, color: '#fff' },
  speakingDot: { color: '#1D9E75', fontSize: 10 },
  youTag: { marginLeft: 'auto', background: '#534AB7', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 4 },
//   participantBar: { background: '#111114', borderTop: '1px solid #2a2a30', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, overflowX: 'auto' },
//   participantBarLabel: { color: '#555', fontSize: 12, flexShrink: 0 },
//   participantList: { display: 'flex', gap: 8, overflowX: 'auto' },
//   participantChip: { display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a1e', border: '1px solid #2a2a30', borderRadius: 99, padding: '4px 10px', fontSize: 12, color: '#ccc', whiteSpace: 'nowrap' },
//   chipDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
//   youBadge: { background: '#534AB7', color: '#fff', fontSize: 10, padding: '1px 5px', borderRadius: 4 },
  chatPanel: { width: '40%', background: '#111114', borderLeft: '1px solid #2a2a30', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  chatHeader: { padding: '12px 16px', borderBottom: '1px solid #2a2a30', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  chatTitle: { color: '#fff', fontSize: 14, fontWeight: 600 },
  closeChatBtn: { background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 16 },
  messageList: { flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' },
  noMessages: { color: '#555', fontSize: 13, textAlign: 'left', marginTop: 24 },
  messageBubble: { fontSize: 13, color: '#fff', lineHeight: 1.5, wordBreak: 'break-word', padding: '8px 12px', maxWidth: '80%' },
  messageItem: { display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '85%' },
  messageMeta: { display: 'flex', alignItems: 'center', gap: 8 },
  messageUsername: { fontSize: 12, fontWeight: 600 },
  messageTime: { fontSize: 11, color: '#555' },
//   messageContent: { fontSize: 13, color: '#ccc', lineHeight: 1.5, wordBreak: 'break-word' },
  chatInput: { padding: 12, borderTop: '1px solid #2a2a30', display: 'flex', gap: 8 },
  chatInputField: { flex: 1, background: '#1a1a1e', border: '1px solid #2a2a30', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' },
  sendBtn: { background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 16 },
  bottomBar: { display: 'flex', alignItems: 'center', borderTop: '1px solid #2a2a30', flexShrink: 0 },
  controlBar: { flex: 1 },
  chatToggleBtn: { border: '1px solid #2a2a30', borderRadius: 8, padding: '8px 16px', color: '#fff', fontSize: 13, cursor: 'pointer', margin: '0 12px', display: 'flex', alignItems: 'center', gap: 6, position: 'relative' },
  unreadBadge: { background: '#f87171', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 99, fontWeight: 700 },
  center: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f10', color: '#888', fontSize: 16 },
}