import axios from 'axios'

const isNgrok = window.location.hostname.includes('ngrok-free.app') || 
                window.location.hostname.includes('ngrok-free.dev')
const isLocalhost = window.location.hostname === 'localhost'

const baseURL = isLocalhost
  ? '/api'
  : isNgrok
    ? '/api'
    : 'http://192.168.1.9:4000'

const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api