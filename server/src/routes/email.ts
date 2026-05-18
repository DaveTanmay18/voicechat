import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import prisma from '../lib/prisma'
import { sendVerificationEmail, sendPasswordResetEmail } from '../lib/email'
import { z } from 'zod'

const forgotSchema = z.object({
  email: z.email('Invalid email address')
})

const resetSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

export default async function emailRoutes(app: FastifyInstance) {

  // Verify email
  app.get('/verify-email', async (request, reply) => {
    const { token } = request.query as { token: string }

    if (!token) {
      return reply.status(400).send({ error: 'Token is required' })
    }

    const stored = await prisma.token.findUnique({ where: { token } })

    if (!stored || stored.type !== 'EMAIL_VERIFICATION' || stored.expiresAt < new Date()) {
      return reply.status(400).send({ error: 'Invalid or expired verification link' })
    }

    await prisma.user.update({
      where: { id: stored.userId },
      data: { verified: true }
    })

    await prisma.token.delete({ where: { token } })

    return reply.send({ message: 'Email verified successfully' })
  })

  // Resend verification email
  app.post('/resend-verification', async (request, reply) => {
    const { email } = request.body as { email: string }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || user.verified) {
      return reply.send({ message: 'If that email exists and is unverified, we sent a link' })
    }

    await prisma.token.deleteMany({
      where: { userId: user.id, type: 'EMAIL_VERIFICATION' }
    })

    const token = crypto.randomBytes(32).toString('hex')
    await prisma.token.create({
      data: {
        token,
        type: 'EMAIL_VERIFICATION',
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    })

    await sendVerificationEmail(user.email, token)
    return reply.send({ message: 'Verification email sent' })
  })

  // Forgot password
  app.post('/forgot-password', async (request, reply) => {
    const result = forgotSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues[0].message })
    }
    const { email } = result.data

    const user = await prisma.user.findUnique({ where: { email } })

    // Always return same message to prevent email enumeration
    if (!user) {
      return reply.send({ message: 'If that email exists, we sent a reset link' })
    }

    await prisma.token.deleteMany({
      where: { userId: user.id, type: 'PASSWORD_RESET' }
    })

    const token = crypto.randomBytes(32).toString('hex')
    await prisma.token.create({
      data: {
        token,
        type: 'PASSWORD_RESET',
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      }
    })

    await sendPasswordResetEmail(user.email, token)
    return reply.send({ message: 'If that email exists, we sent a reset link' })
  })

  // Reset password
  app.post('/reset-password', async (request, reply) => {
    const result = resetSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues[0].message })
    }
    const { token, password } = result.data

    const stored = await prisma.token.findUnique({ where: { token } })

    if (!stored || stored.type !== 'PASSWORD_RESET' || stored.expiresAt < new Date()) {
      return reply.status(400).send({ error: 'Invalid or expired reset link' })
    }

    const hashed = await bcrypt.hash(password, 12)

    await prisma.user.update({
      where: { id: stored.userId },
      data: { password: hashed }
    })

    // Delete all refresh tokens to force re-login everywhere
    await prisma.refreshToken.deleteMany({ where: { userId: stored.userId } })
    await prisma.token.delete({ where: { token } })

    return reply.send({ message: 'Password reset successfully' })
  })
}