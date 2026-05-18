import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import toast from 'react-hot-toast'

export default function Register() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/v1/auth/register', { email, username, password })
      setRegistered(true)
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Registration failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (registered) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 16 }}>📧</div>
          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 600, textAlign: 'center', margin: '0 0 12px' }}>Check your email</h2>
          <p style={{ color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 1.6 }}>
            We sent a verification link to <strong style={{ color: '#fff' }}>{email}</strong>. Click the link to activate your account.
          </p>
          <p style={{ textAlign: 'center', marginTop: 24 }}>
            <Link to="/login" style={styles.link}>Back to login</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>VoiceChat</h1>
        <p style={styles.subtitle}>Create your account</p>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              style={styles.input}
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="cooluser"
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p style={styles.switch}>
          Already have an account? <Link to="/login" style={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f10' },
  card: { background: '#1a1a1e', border: '1px solid #2a2a30', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 400 },
  title: { color: '#ffffff', fontSize: 28, fontWeight: 700, textAlign: 'center', margin: '0 0 6px' },
  subtitle: { color: '#888', textAlign: 'center', margin: '0 0 28px', fontSize: 14 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { color: '#ccc', fontSize: 13, fontWeight: 500 },
  input: { background: '#111114', border: '1px solid #2a2a30', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none' },
  button: { background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  error: { background: '#2d1515', border: '1px solid #5a2020', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13, marginBottom: 16 },
  switch: { textAlign: 'center', color: '#888', fontSize: 13, marginTop: 24 },
  link: { color: '#7C74E0', textDecoration: 'none', fontWeight: 500 },
}