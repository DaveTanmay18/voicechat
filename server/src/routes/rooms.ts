import { FastifyInstance } from 'fastify'
import { AccessToken } from 'livekit-server-sdk'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'
import { createRoomSchema } from '../lib/schemas'

export default async function roomRoutes(app: FastifyInstance) {

  // GET all rooms
  app.get('/', { preHandler: authenticate }, async (request, reply) => {
    const rooms = await prisma.room.findMany({
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'desc' }
    })
    return reply.send({ rooms })
  })

  // POST create a room
  app.post('/', { preHandler: authenticate }, async (request, reply) => {
    const result = createRoomSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues[0].message })
    }
    const { name, description } = result.data
    const userId = (request as any).userId

    const room = await prisma.room.create({
      data: { name, description, createdBy: userId },
      include: { user: { select: { username: true } } }
    })

    return reply.status(201).send({ room })
  })

  // DELETE a room
  app.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).userId
    const { id } = request.params as { id: string }

    const room = await prisma.room.findUnique({ where: { id } })
    if (!room) {
      return reply.status(404).send({ error: 'Room not found' })
    }
    if (room.createdBy !== userId) {
      return reply.status(403).send({ error: 'Only the room creator can delete it' })
    }

    await prisma.room.delete({ where: { id } })
    return reply.send({ message: 'Room deleted' })
  })

  // POST generate LiveKit token
  app.post('/:id/token', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).userId
    const { id } = request.params as { id: string }

    const room = await prisma.room.findUnique({ where: { id } })
    if (!room) {
      return reply.status(404).send({ error: 'Room not found' })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return reply.status(404).send({ error: 'User not found' })
    }

    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
      { identity: userId, name: user.username }
    )

    at.addGrant({ roomJoin: true, room: id, canPublish: true, canSubscribe: true })

    const token = await at.toJwt()
    return reply.send({ token, url: process.env.LIVEKIT_URL, room: { id: room.id, name: room.name } })
  })
}