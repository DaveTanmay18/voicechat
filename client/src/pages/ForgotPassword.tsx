import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import toast from 'react-hot-toast'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/v1/forgot-password', { email })
      setSent(true)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.icon}>📧</div>
          <h2 style={styles.title}>Check your email</h2>
          <p style={styles.message}>
            If an account exists for <strong style={{ color: '#fff' }}>{email}</strong>, we sent a password reset link. Check your inbox and spam folder.
          </p>
          <Link to="/login" style={styles.link}>Back to login</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.appTitle}>VoiceChat</h1>
        <h2 style={styles.title}>Forgot password?</h2>
        <p style={styles.message}>Enter your email and we'll send you a reset link.</p>
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
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
        <p style={styles.switch}>
          Remember your password? <Link to="/login" style={styles.linkInline}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f10' },
  card: { background: '#1a1a1e', border: '1px solid #2a2a30', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 400, textAlign: 'center' },
  icon: { fontSize: 48, marginBottom: 16 },
  appTitle: { color: '#ffffff', fontSize: 28, fontWeight: 700, margin: '0 0 6px' },
  title: { color: '#fff', fontSize: 20, fontWeight: 600, margin: '0 0 8px' },
  message: { color: '#888', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 },
  form: { display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { color: '#ccc', fontSize: 13, fontWeight: 500 },
  input: { background: '#111114', border: '1px solid #2a2a30', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none' },
  btn: { background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  switch: { textAlign: 'center', color: '#888', fontSize: 13, marginTop: 24 },
  link: { color: '#7C74E0', textDecoration: 'none', fontWeight: 500, display: 'block', marginTop: 16 },
  linkInline: { color: '#7C74E0', textDecoration: 'none', fontWeight: 500 },
}