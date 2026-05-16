import { FastifyRequest, FastifyReply } from 'fastify'
import { verifyAccessToken } from '../lib/jwt'

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing or invalid authorization header' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = verifyAccessToken(token)
    ;(request as any).userId = payload.userId
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired access token' })
  }
}