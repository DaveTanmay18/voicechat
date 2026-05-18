import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import toast from 'react-hot-toast'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const token = searchParams.get('token')

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (!token) {
      toast.error('Invalid reset link')
      return
    }
    setLoading(true)
    try {
      await api.post('/v1/reset-password', { token, password })
      toast.success('Password reset successfully!')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.appTitle}>VoiceChat</h1>
        <h2 style={styles.title}>Reset password</h2>
        <p style={styles.message}>Enter your new password below.</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>New password</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Confirm password</label>
            <input
              style={styles.input}
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset password'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f10' },
  card: { background: '#1a1a1e', border: '1px solid #2a2a30', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 400 },
  appTitle: { color: '#ffffff', fontSize: 28, fontWeight: 700, margin: '0 0 6px', textAlign: 'center' },
  title: { color: '#fff', fontSize: 20, fontWeight: 600, margin: '0 0 8px', textAlign: 'center' },
  message: { color: '#888', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6, textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { color: '#ccc', fontSize: 13, fontWeight: 500 },
  input: { background: '#111114', border: '1px solid #2a2a30', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none' },
  btn: { background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
}