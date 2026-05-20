import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { Server } from 'socket.io'
import 'dotenv/config'
import authRoutes from './routes/auth'
import roomRoutes from './routes/rooms'
import emailRoutes from './routes/email'
import { authenticate } from './middleware/authenticate'
import { verifyAccessToken } from './lib/jwt'

const app = Fastify({ logger: true })

// Security headers
app.register(helmet, { contentSecurityPolicy: false })

// Rate limiting
app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  errorResponseBuilder: () => ({ error: 'Too many requests — please slow down' })
})

// CORS
app.register(cors, {
  origin: [
    'http://localhost:3000',
    'http://192.168.29.17:3000',
    'https://voicechat-client.vercel.app',
    /\.vercel\.app$/,
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
})

// Global error handler
app.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
  app.log.error(error)
  const statusCode = error.statusCode || 500
  return reply.status(statusCode).send({
    error: statusCode === 500 ? 'Internal server error' : error.message
  })
})

// Public routes
app.get('/health', async () => ({ status: 'ok', timestamp: new Date() }))

// Auth routes with stricter rate limit
app.register(async (instance) => {
  await instance.register(rateLimit, {
    max: 10,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({ error: 'Too many attempts — please wait a minute' })
  })
  instance.register(authRoutes, { prefix: '/v1/auth' })
})

// Room + email routes
app.register(roomRoutes, { prefix: '/v1/rooms' })
app.register(emailRoutes, { prefix: '/v1' })

// Protected test route
app.get('/v1/me', { preHandler: authenticate }, async (request, reply) => {
  const userId = (request as any).userId
  return reply.send({ userId, message: 'You are authenticated!' })
})

// Start Fastify first, then attach Socket.io
const PORT = Number(process.env.PORT) || 4000

app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) { app.log.error(err); process.exit(1) }
})

app.server.on('listening', () => {
  // Attach Socket.io to Fastify's underlying HTTP server
  const io = new Server(app.server, {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://192.168.29.17:3000',
        'https://voicechat-client.vercel.app',
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    }
  })

  // In-memory chat store
  const roomMessages: Record<string, { id: string, username: string, content: string, timestamp: number }[]> = {}

  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) return next(new Error('Authentication required'))
    try {
      const payload = verifyAccessToken(token)
      ;(socket as any).userId = payload.userId
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    socket.on('join-room', ({ roomId, username }: { roomId: string, username: string }) => {
      socket.join(roomId)
      ;(socket as any).roomId = roomId
      ;(socket as any).username = username
      const messages = roomMessages[roomId] || []
      socket.emit('message-history', messages)
      socket.to(roomId).emit('user-joined-chat', { username })
    })

    socket.on('send-message', ({ roomId, content }: { roomId: string, content: string }) => {
      const username = (socket as any).username
      if (!username || !content.trim()) return
      const message = {
        id: Date.now().toString(),
        username,
        content: content.trim().slice(0, 500),
        timestamp: Date.now()
      }
      if (!roomMessages[roomId]) roomMessages[roomId] = []
      roomMessages[roomId].push(message)
      if (roomMessages[roomId].length > 100) roomMessages[roomId].shift()
      io.to(roomId).emit('new-message', message)
    })

    socket.on('leave-room', ({ roomId }: { roomId: string }) => {
      socket.leave(roomId)
      const username = (socket as any).username
      if (username) socket.to(roomId).emit('user-left-chat', { username })
      const roomSize = io.sockets.adapter.rooms.get(roomId)?.size || 0
      if (roomSize === 0) delete roomMessages[roomId]
    })

    socket.on('disconnect', () => {
      const roomId = (socket as any).roomId
      const username = (socket as any).username
      if (roomId && username) {
        socket.to(roomId).emit('user-left-chat', { username })
        const roomSize = io.sockets.adapter.rooms.get(roomId)?.size || 0
        if (roomSize === 0) delete roomMessages[roomId]
      }
    })
  })
})