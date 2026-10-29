import { type NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'
import { cookies } from 'next/headers'

const SESSION_COOKIE_NAME = '__session'
const SESSION_DURATION_MS = 60 * 60 * 24 * 14 * 1000 // 14 days

/**
 * POST /api/auth/session
 * Exchange a Firebase ID token for a server-side session cookie.
 */
export async function POST(req: NextRequest) {
  try {
    const { token } = (await req.json()) as { token?: string }

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    // Verify the ID token and create a session cookie
    const sessionCookie = await adminAuth.createSessionCookie(token, {
      expiresIn: SESSION_DURATION_MS,
    })

    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      maxAge: SESSION_DURATION_MS / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Session creation failed:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

/**
 * GET /api/auth/session
 * Clear a session cookie that no longer verifies (expired or revoked) and go
 * to sign in. Without this the proxy sees the cookie and sends the user back
 * to /dashboard, which loops.
 */
export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
  return NextResponse.redirect(new URL('/auth/signin', req.url))
}

/**
 * DELETE /api/auth/session
 * Clear the session cookie (sign out server-side).
 */
export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
  return NextResponse.json({ success: true })
}
