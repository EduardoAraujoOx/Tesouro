import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Root path is public (preview page)
  if (req.nextUrl.pathname === '/') return NextResponse.next()

  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      const url = new URL('/login', req.url)
      return NextResponse.redirect(url)
    }
  } catch {
    // Fail closed: any error in token verification sends to login
    const url = new URL('/login', req.url)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)'],
}
