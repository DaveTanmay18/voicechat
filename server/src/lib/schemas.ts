import { z } from 'zod'

export const registerSchema = z.object({
  email: z.email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be at most 20 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password too long'),
})

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

export const createRoomSchema = z.object({
  name: z.string().min(1, 'Room name is required').max(50, 'Room name must be at most 50 characters'),
  description: z.string().max(200, 'Description must be at most 200 characters').optional(),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateRoomInput = z.infer<typeof createRoomSchema>