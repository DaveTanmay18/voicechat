import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import prisma from '../lib/prisma'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt'
import { registerSchema, loginSchema, refreshSchema } from '../lib/schemas'
import { sendVerificationEmail } from '../lib/email'

export default async function authRoutes(app: FastifyInstance) {

  // REGISTER
  app.post('/register', async (request, reply) => {
    const result = registerSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues[0].message })
    }
    const { email, username, password } = result.data

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    })
    if (existing) {
      return reply.status(409).send({ error: 'Email or username already taken' })
    }

    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email, username, password: hashed }
    })

    try {
      const verifyToken = crypto.randomBytes(32).toString('hex')
      await prisma.token.create({
        data: {
          token: verifyToken,
          type: 'EMAIL_VERIFICATION',
          userId: user.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      })
      await sendVerificationEmail(user.email, verifyToken)
    } catch (tokenError) {
      app.log.error(tokenError)
    }

    return reply.status(201).send({
      message: 'Account created! Please check your email to verify your account.',
      user: { id: user.id, email: user.email, username: user.username }
    })
  })

  // LOGIN
  app.post('/login', async (request, reply) => {
    const result = loginSchema.safeParse(request.body)
    if (!result.success) {
        return reply.status(400).send({ error: result.error.issues[0].message })
    }
    const { identifier, password } = result.data

    // Find by email or username
    const user = await prisma.user.findFirst({
        where: {
        OR: [
            { email: identifier.toLowerCase() },
            { username: identifier.toLowerCase() }
        ]
        }
    })

    if (!user) {
        return reply.status(401).send({ error: 'Invalid email/username or password' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
        return reply.status(401).send({ error: 'Invalid email/username or password' })
    }

    if (!user.verified) {
        return reply.status(403).send({ error: 'Please verify your email before logging in' })
    }

    const accessToken = signAccessToken(user.id)
    const refreshToken = signRefreshToken(user.id)

    await prisma.refreshToken.create({
        data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
    })

    return reply.send({
        accessToken, refreshToken,
        user: { id: user.id, email: user.email, username: user.username }
    })
  })

  // REFRESH
  app.post('/refresh', async (request, reply) => {
    const result = refreshSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues[0].message })
    }
    const { refreshToken } = result.data

    let payload: { userId: string }
    try {
      payload = verifyRefreshToken(refreshToken)
    } catch {
      return reply.status(401).send({ error: 'Invalid or expired refresh token' })
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } })
    if (!stored || stored.expiresAt < new Date()) {
      return reply.status(401).send({ error: 'Refresh token not found or expired' })
    }

    await prisma.refreshToken.delete({ where: { token: refreshToken } })

    const newAccessToken = signAccessToken(payload.userId)
    const newRefreshToken = signRefreshToken(payload.userId)

    await prisma.refreshToken.create({
      data: { token: newRefreshToken, userId: payload.userId, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
    })

    return reply.send({ accessToken: newAccessToken, refreshToken: newRefreshToken })
  })

  // LOGOUT
  app.post('/logout', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string }
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } })
    }
    return reply.send({ message: 'Logged out successfully' })
  })
}