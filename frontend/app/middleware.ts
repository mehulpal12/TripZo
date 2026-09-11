import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Protect /rider routes
  if (pathname.startsWith('/rider') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Protect /captain routes
  if (pathname.startsWith('/captain') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users away from auth pages
  if ((pathname.startsWith('/login') || pathname.startsWith('/register')) && token) {
    // We can't definitively check role in middleware without a role cookie, 
    // so we default to /rider or let client-side handle it.
    // We'll let the auth.store bootstrap handle exact redirection,
    // but here we can just fallback to /rider
    return NextResponse.redirect(new URL('/rider', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/rider/:path*', '/captain/:path*', '/login', '/register'],
};
