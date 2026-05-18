import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setMessage('Invalid verification link')
      return
    }

    api.get(`/v1/verify-email?token=${token}`)
      .then(() => {
        setStatus('success')
        setMessage('Email verified successfully! Redirecting to login...')
        setTimeout(() => navigate('/login'), 3000)
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.response?.data?.error || 'Invalid or expired verification link')
      })
  }, [])

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.icon}>
          {status === 'loading' ? '⏳' : status === 'success' ? '✅' : '❌'}
        </div>
        <h2 style={styles.title}>
          {status === 'loading' ? 'Verifying your email...' : status === 'success' ? 'Email Verified!' : 'Verification Failed'}
        </h2>
        <p style={styles.message}>{message}</p>
        {status === 'error' && (
          <button style={styles.btn} onClick={() => navigate('/login')}>
            Back to Login
          </button>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0f0f10', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  card: { background: '#1a1a1e', border: '1px solid #2a2a30', borderRadius: 16, padding: '40px 36px', maxWidth: 400, width: '100%', textAlign: 'center' },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { color: '#fff', fontSize: 20, fontWeight: 600, margin: '0 0 12px' },
  message: { color: '#888', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 },
  btn: { background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
}