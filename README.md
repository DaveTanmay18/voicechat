# 🎙️ VoiceChat

A voice chat application with real-time voice, video, screen sharing, and room management.

**Live Demo:** [voicechat-client.vercel.app](https://voicechat-client.vercel.app)

---

## ✨ Features

### Authentication
- Email + password registration with email verification
- Login with email **or** username
- JWT access tokens (15min) + refresh tokens (30 days)
- Forgot password / reset password via email
- Auto logout on token expiry

### Voice Rooms
- **Public rooms** — anyone can join
- **Private rooms** — password protected
- **Invite Only rooms** — invite link required
- Real-time voice communication via LiveKit (WebRTC)
- Camera and screen sharing support
- Microphone mute/unmute controls
- Room member tracking

### Invite System
- Generate shareable invite links (7 day expiry)
- WhatsApp deep link sharing
- Non-users can register and auto-join via invite link

### Security & Validation
- Zod input validation on all endpoints
- Rate limiting (100 req/min global, 10 req/min on auth routes)
- Helmet security headers
- bcrypt password hashing
- CORS protection

### Frontend
- React 19 + TypeScript + Vite
- Toast notifications
- Error boundary
- Protected routing
- Mobile responsive

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Backend | Node.js, Fastify, TypeScript |
| Database | PostgreSQL 16 (Neon) |
| ORM | Prisma 7 |
| Voice/Video | LiveKit (WebRTC SFU) |
| Auth | JWT, bcryptjs |
| Validation | Zod v4 |
| Email | Resend |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |
| Package Manager | pnpm (monorepo workspaces) |

---

## 🚀 Local Development Setup

### Prerequisites

- Windows (with Docker Desktop)
- Node.js v20+
- pnpm
- Docker Desktop

### 1. Clone the repository

```bash
git clone https://github.com/DaveTanmay18/voicechat.git
cd voicechat
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

Create `server/.env`:

```env
PORT=4000
DATABASE_URL=postgresql://voicechat:secret@localhost:5432/voicechat_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret
LIVEKIT_URL=ws://localhost:7880
RESEND_API_KEY=your_resend_api_key
FRONTEND_URL=http://localhost:3000
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:4000
VITE_LIVEKIT_URL=ws://localhost:7880
```

### 4. Run database migrations

```bash
cd server
npx prisma migrate dev
npx prisma generate
```

### 5. Start the development environment

```bash
cd ..
pnpm dev
```

This starts:
- 🐘 PostgreSQL on `localhost:5432`
- 🔴 Redis on `localhost:6379`
- 🎙️ LiveKit on `localhost:7880`
- ⚡ Fastify API on `localhost:4000`
- ⚛️ React app on `localhost:3000`

---

## 📁 Project Structure

```
voicechat/
├── server/                    # Node.js Fastify API
│   ├── src/
│   │   ├── lib/
│   │   │   ├── prisma.ts      # Prisma client
│   │   │   ├── jwt.ts         # JWT utilities
│   │   │   ├── email.ts       # Resend email service
│   │   │   └── schemas.ts     # Zod validation schemas
│   │   ├── middleware/
│   │   │   └── authenticate.ts # JWT auth middleware
│   │   ├── routes/
│   │   │   ├── auth.ts        # Auth endpoints
│   │   │   ├── rooms.ts       # Room endpoints
│   │   │   └── email.ts       # Email endpoints
│   │   └── index.ts           # Server entry point
│   └── prisma/
│       └── schema.prisma      # Database schema
├── client/                    # React frontend
│   └── src/
│       ├── components/
│       │   ├── ErrorBoundary.tsx
│       │   └── ProtectedRoute.tsx
│       ├── context/
│       │   └── AuthContext.tsx
│       ├── lib/
│       │   └── api.ts         # Axios instance
│       └── pages/
│           ├── Login.tsx
│           ├── Register.tsx
│           ├── Dashboard.tsx
│           ├── VoiceRoom.tsx
│           ├── VerifyEmail.tsx
│           ├── ForgotPassword.tsx
│           ├── ResetPassword.tsx
│           └── JoinRoom.tsx
├── docker-compose.yml
└── pnpm-workspace.yaml
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | /v1/auth/register | Register new user |
| POST | /v1/auth/login | Login (email or username) |
| POST | /v1/auth/refresh | Refresh access token |
| POST | /v1/auth/logout | Logout |

### Email
| Method | Endpoint | Description |
|---|---|---|
| GET | /v1/verify-email?token= | Verify email address |
| POST | /v1/resend-verification | Resend verification email |
| POST | /v1/forgot-password | Send password reset email |
| POST | /v1/reset-password | Reset password |

### Rooms
| Method | Endpoint | Description |
|---|---|---|
| GET | /v1/rooms | List all rooms |
| POST | /v1/rooms | Create a room |
| DELETE | /v1/rooms/:id | Delete a room |
| POST | /v1/rooms/:id/join | Join a room |
| POST | /v1/rooms/:id/token | Get LiveKit token |
| POST | /v1/rooms/:id/invite | Generate invite link |
| GET | /v1/rooms/join/:token | Join via invite link |

---

## 🗄️ Database Schema

```prisma
model User {
  id            String         @id @default(cuid())
  email         String         @unique
  password      String
  username      String         @unique
  phone         String?
  verified      Boolean        @default(false)
  isAdmin       Boolean        @default(false)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model Room {
  id          String     @id @default(cuid())
  name        String
  description String?
  type        RoomType   @default(PUBLIC)
  password    String?
  createdBy   String
  createdAt   DateTime   @default(now())
}

enum RoomType {
  PUBLIC
  PRIVATE
  INVITE_ONLY
}
```

---

## 🌐 Production Deployment

| Service | Platform | URL |
|---|---|---|
| Frontend | Vercel | https://voicechat-client.vercel.app |
| Backend | Render | https://voicechat-server-t4uq.onrender.com |
| Database | Neon PostgreSQL | Singapore region |
| Voice | LiveKit Cloud | Singapore region |

### Deploy to production

```bash
git add .
git commit -m "your changes"
git push
```

Render and Vercel auto-deploy on every push to `master`.

### Run production migrations

```bash
cd server
set "DATABASE_URL=your_neon_connection_string"
npx prisma migrate deploy
```

---

## 🔒 Environment Variables Reference

### Server

| Variable | Description |
|---|---|
| PORT | Server port (default 4000) |
| DATABASE_URL | PostgreSQL connection string |
| REDIS_URL | Redis connection string |
| JWT_SECRET | Secret for access tokens |
| JWT_REFRESH_SECRET | Secret for refresh tokens |
| LIVEKIT_API_KEY | LiveKit API key |
| LIVEKIT_API_SECRET | LiveKit API secret |
| LIVEKIT_URL | LiveKit WebSocket URL |
| RESEND_API_KEY | Resend email API key |
| FRONTEND_URL | Frontend URL for email links |
| NODE_ENV | Set to `production` in prod |

### Client

| Variable | Description |
|---|---|
| VITE_API_URL | Backend API URL |
| VITE_LIVEKIT_URL | LiveKit WebSocket URL |

---

## 📱 Room Types

| Type | Icon | Description |
|---|---|---|
| Public | 🌐 | Anyone can see and join |
| Private | 🔒 | Password required to join |
| Invite Only | 🔑 | Invite link required |

---

## 🛣️ Roadmap

- [ ] Live chat in rooms
- [ ] Super admin panel
- [ ] Direct messages (DMs)
- [ ] User profiles & avatars
- [ ] Online presence indicators
- [ ] Push notifications
- [ ] Room search & categories
- [ ] Custom domain for emails

---

## 👨‍💻 Built By

**Tanmay Dave** — [@DaveTanmay18](https://github.com/DaveTanmay18)

Built from scratch across 5 phases using Claude as a development assistant.

---

## 📄 License

MIT
