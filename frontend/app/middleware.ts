import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || 'a6e570e8c8f703f18178c3dfde0d1ac25e7e0995cf5942fcd691a5492da6760a26af98ae0bc67ad312818f4c5a8594bf04a7768d593869208935ed9cd4a78fd6'
);

async function getRoleFromToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return (payload.role as string) || null;
  } catch (err) {
    // If token verification fails (expired, invalid signature, corrupted), treat as unauthenticated
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value || request.cookies.get('accessToken')?.value;
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
