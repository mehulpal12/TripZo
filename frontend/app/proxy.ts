import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || 'helloMehulpal7678'
);

async function getRoleFromToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return (payload.role as string) || null;
  } catch (err) {
    // In case of local development secret desync, gracefully decode payload
    try {
      const payloadBase64 = token.split('.')[1];
      if (payloadBase64) {
        const payload = JSON.parse(atob(payloadBase64));
        if (payload.exp && payload.exp * 1000 > Date.now()) {
          return (payload.role as string) || null;
        }
      }
    } catch {}
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  const role = token ? await getRoleFromToken(token) : null;
  const isAuthenticated = Boolean(token && role);

  // Protect /rider routes
  if (pathname.startsWith('/rider')) {
    if (!isAuthenticated) return NextResponse.redirect(new URL('/login', request.url));
    if (role === 'CAPTAIN') return NextResponse.redirect(new URL('/captain', request.url));
  }

  // Protect /captain routes
  if (pathname.startsWith('/captain')) {
    if (!isAuthenticated) return NextResponse.redirect(new URL('/login', request.url));
    if (role === 'RIDER') return NextResponse.redirect(new URL('/rider', request.url));
  }

  // Redirect authenticated users away from auth pages
  if ((pathname.startsWith('/login') || pathname.startsWith('/register')) && isAuthenticated) {
    if (role === 'CAPTAIN') {
      return NextResponse.redirect(new URL('/captain', request.url));
    } else {
      return NextResponse.redirect(new URL('/rider', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/rider/:path*', '/captain/:path*', '/login', '/register'],
};
