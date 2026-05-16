import { Component } from 'react'
import type { ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.page}>
          <div style={styles.box}>
            <div style={styles.icon}>⚠️</div>
            <h2 style={styles.title}>Something went wrong</h2>
            <p style={styles.message}>{this.state.message}</p>
            <button style={styles.btn} onClick={() => window.location.href = '/dashboard'}>
              Go to Dashboard
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0f0f10', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  box: { background: '#1a1a1e', border: '1px solid #2a2a30', borderRadius: 16, padding: '40px 36px', maxWidth: 400, textAlign: 'center' },
  icon: { fontSize: 40, marginBottom: 16 },
  title: { color: '#fff', fontSize: 20, fontWeight: 600, margin: '0 0 10px' },
  message: { color: '#888', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 },
  btn: { background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
}