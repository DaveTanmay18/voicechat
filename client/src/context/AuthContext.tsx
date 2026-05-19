import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import api from '../lib/api'

interface User {
  id: string
  email: string
  username: string
}

interface AuthContextType {
  user: User | null
  accessToken: string | null
  login: (identifier: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      setAccessToken(token)
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const login = async (identifier: string, password: string) => {
    const res = await api.post('/v1/auth/login', { identifier, password })
    const { accessToken, refreshToken, user } = res.data
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(user))
    setAccessToken(accessToken)
    setUser(user)

    // Check for pending invite
    const pendingInvite = localStorage.getItem('pendingInviteToken')
    if (pendingInvite) {
        localStorage.removeItem('pendingInviteToken')
        window.location.href = `/join/${pendingInvite}`
    }
  }

  const register = async (email: string, username: string, password: string) => {
    await api.post('/v1/auth/register', { email, username, password })
  }

  const logout = () => {
    const refreshToken = localStorage.getItem('refreshToken')
    api.post('/v1/auth/logout', { refreshToken }).catch(() => {})
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setAccessToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}