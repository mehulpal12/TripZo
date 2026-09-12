import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Helper to get role from token
  let role = null;
  if (token) {
    try {
      const payloadBase64 = token.split('.')[1];
      const payloadDecoded = atob(payloadBase64);
      const payload = JSON.parse(payloadDecoded);
      role = payload.role;
    } catch (e) {
      // invalid token format
    }
  }

  // Protect /rider routes
  if (pathname.startsWith('/rider')) {
    if (!token) return NextResponse.redirect(new URL('/login', request.url));
    if (role === 'CAPTAIN') return NextResponse.redirect(new URL('/captain', request.url));
  }

  // Protect /captain routes
  if (pathname.startsWith('/captain')) {
    if (!token) return NextResponse.redirect(new URL('/login', request.url));
    if (role === 'RIDER') return NextResponse.redirect(new URL('/rider', request.url));
  }

  // Redirect authenticated users away from auth pages
  if ((pathname.startsWith('/login') || pathname.startsWith('/register')) && token) {
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
