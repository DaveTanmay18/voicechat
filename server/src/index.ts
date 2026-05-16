import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import 'dotenv/config'
import authRoutes from './routes/auth'
import roomRoutes from './routes/rooms'
import { authenticate } from './middleware/authenticate'

const app = Fastify({ logger: true })

// Security headers
app.register(helmet, { contentSecurityPolicy: false })

// Rate limiting — 100 requests per minute globally
app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  errorResponseBuilder: () => ({
    error: 'Too many requests — please slow down'
  })
})

// CORS
app.register(cors, {
  origin: [
    'http://localhost:3000',
    'http://192.168.1.9:3000',
  ]
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
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date() }
})

// Auth routes — stricter rate limit on login/register
app.register(async (instance) => {
  await instance.register(rateLimit, {
    max: 10,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      error: 'Too many attempts — please wait a minute'
    })
  })
  instance.register(authRoutes, { prefix: '/v1/auth' })
})

// Room routes
app.register(roomRoutes, { prefix: '/v1/rooms' })

// Protected test route
app.get('/v1/me', { preHandler: authenticate }, async (request, reply) => {
  const userId = (request as any).userId
  return reply.send({ userId, message: 'You are authenticated!' })
})

app.listen({ port: Number(process.env.PORT) || 4000, host: '0.0.0.0' }, (err) => {
  if (err) { app.log.error(err); process.exit(1) }
})