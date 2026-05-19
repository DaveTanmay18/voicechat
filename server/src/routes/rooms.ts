import { FastifyInstance } from 'fastify'
import { AccessToken } from 'livekit-server-sdk'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'
import { createRoomSchema, joinPrivateRoomSchema } from '../lib/schemas'

export default async function roomRoutes(app: FastifyInstance) {

  // GET all rooms
  app.get('/', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).userId
    const rooms = await prisma.room.findMany({
        where: {
        OR: [
            { type: 'PUBLIC' as const },
            { type: 'PRIVATE' as const },
            { createdBy: userId },
            { members: { some: { userId } } }
        ]
        },
        include: {
        user: { select: { username: true } },
        _count: { select: { members: true } }
        },
        orderBy: { createdAt: 'desc' }
    })
    return reply.send({ rooms: rooms.map(r => ({ ...r, password: undefined })) })
  })

  // POST create a room
  app.post('/', { preHandler: authenticate }, async (request, reply) => {
    const result = createRoomSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues[0].message })
    }
    const { name, description, type, password } = result.data
    const userId = (request as any).userId

    if (type === 'PRIVATE' && !password) {
      return reply.status(400).send({ error: 'Password is required for private rooms' })
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null

    const room = await prisma.room.create({
      data: {
        name,
        description,
        type,
        password: hashedPassword,
        createdBy: userId
      },
      include: { user: { select: { username: true } } }
    })

    // Creator is automatically a member
    await prisma.roomMember.create({
      data: { roomId: room.id, userId }
    })

    return reply.status(201).send({ room: { ...room, password: undefined } })
  })

  // DELETE a room
  app.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).userId
    const { id } = request.params as { id: string }

    const room = await prisma.room.findUnique({ where: { id } })
    if (!room) return reply.status(404).send({ error: 'Room not found' })
    if (room.createdBy !== userId) return reply.status(403).send({ error: 'Only the room creator can delete it' })

    await prisma.room.delete({ where: { id } })
    return reply.send({ message: 'Room deleted' })
  })

  // POST join a room (handles public, private, invite-only)
  app.post('/:id/join', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).userId
    const { id } = request.params as { id: string }
    const { password } = (request.body as any) || {}

    const room = await prisma.room.findUnique({ where: { id } })
    if (!room) return reply.status(404).send({ error: 'Room not found' })

    // Check if already a member
    const existing = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: id, userId } }
    })
    if (existing) return reply.send({ message: 'Already a member' })

    if (room.type === 'PRIVATE') {
      if (!password) return reply.status(400).send({ error: 'Password is required' })
      const valid = await bcrypt.compare(password, room.password!)
      if (!valid) return reply.status(401).send({ error: 'Incorrect room password' })
    }

    if (room.type === 'INVITE_ONLY') {
      return reply.status(403).send({ error: 'This room is invite only' })
    }

    await prisma.roomMember.create({ data: { roomId: id, userId } })
    return reply.send({ message: 'Joined room successfully' })
  })

  // POST generate invite link
  app.post('/:id/invite', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).userId
    const { id } = request.params as { id: string }

    const room = await prisma.room.findUnique({ where: { id } })
    if (!room) return reply.status(404).send({ error: 'Room not found' })
    if (room.createdBy !== userId) return reply.status(403).send({ error: 'Only the room creator can generate invite links' })

    // Delete existing invites for this room
    await prisma.roomInvite.deleteMany({ where: { roomId: id } })

    const token = crypto.randomBytes(32).toString('hex')
    await prisma.roomInvite.create({
      data: {
        token,
        roomId: id,
        createdBy: userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    })

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const inviteLink = `${frontendUrl}/join/${token}`
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(`Join me in "${room.name}" on VoiceChat! ${inviteLink}`)}`

    return reply.send({ inviteLink, whatsappLink, token })
  })

  // GET join via invite link
  app.get('/join/:token', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).userId
    const { token } = request.params as { token: string }

    const invite = await prisma.roomInvite.findUnique({
      where: { token },
      include: { room: true }
    })

    if (!invite || invite.expiresAt < new Date()) {
      return reply.status(400).send({ error: 'Invalid or expired invite link' })
    }

    // Add as member if not already
    await prisma.roomMember.upsert({
      where: { roomId_userId: { roomId: invite.roomId, userId } },
      create: { roomId: invite.roomId, userId },
      update: {}
    })

    return reply.send({
      message: 'Joined room successfully',
      roomId: invite.roomId,
      roomName: invite.room.name
    })
  })

  // POST generate LiveKit token
  app.post('/:id/token', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).userId
    const { id } = request.params as { id: string }

    const room = await prisma.room.findUnique({ where: { id } })
    if (!room) return reply.status(404).send({ error: 'Room not found' })

    // For invite-only rooms check membership
    if (room.type === 'INVITE_ONLY') {
      const member = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId: id, userId } }
      })
      if (!member && room.createdBy !== userId) {
        return reply.status(403).send({ error: 'You are not a member of this room' })
      }
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return reply.status(404).send({ error: 'User not found' })

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