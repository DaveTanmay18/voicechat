import 'dotenv/config'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'VoiceChat <onboarding@resend.dev>'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
const DEV_EMAIL = 'davetanmay18@gmail.com'
const isProd = process.env.NODE_ENV === 'production'

export async function sendVerificationEmail(email: string, token: string) {
  const link = `${FRONTEND_URL}/verify-email?token=${token}`
  const to = isProd ? email : DEV_EMAIL
  const subject = isProd
    ? 'Verify your VoiceChat email'
    : `[Test for ${email}] Verify your VoiceChat email`

  await resend.emails.send({
    from: FROM,
    to,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f0f10;color:#fff;border-radius:12px">
        <h1 style="color:#7C74E0;margin:0 0 8px">VoiceChat</h1>
        <h2 style="margin:0 0 16px;font-size:20px">Verify your email</h2>
        <p style="color:#888;margin:0 0 24px">Click the button below to verify your email address and activate your account.</p>
        <a href="${link}" style="display:inline-block;background:#534AB7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Verify Email</a>
        <p style="color:#555;font-size:12px;margin:24px 0 0">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
      </div>
    `
  })
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const link = `${FRONTEND_URL}/reset-password?token=${token}`
  const to = isProd ? email : DEV_EMAIL
  const subject = isProd
    ? 'Reset your VoiceChat password'
    : `[Test for ${email}] Reset your VoiceChat password`

  await resend.emails.send({
    from: FROM,
    to,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f0f10;color:#fff;border-radius:12px">
        <h1 style="color:#7C74E0;margin:0 0 8px">VoiceChat</h1>
        <h2 style="margin:0 0 16px;font-size:20px">Reset your password</h2>
        <p style="color:#888;margin:0 0 24px">Click the button below to reset your password. This link expires in 1 hour.</p>
        <a href="${link}" style="display:inline-block;background:#534AB7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a>
        <p style="color:#555;font-size:12px;margin:24px 0 0">If you didn't request a password reset, ignore this email.</p>
      </div>
    `
  })
}