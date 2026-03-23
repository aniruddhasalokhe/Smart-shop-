import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('shopfloor_token')?.value;
  const path = request.nextUrl.pathname;

  // Root redirects to login or appropriate dashboard
  if (path === '/') {
    if (!token) return NextResponse.redirect(new URL('/login', request.url));
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.redirect(new URL('/login', request.url));
    
    if (payload.role === 'OPERATOR') return NextResponse.redirect(new URL('/employee', request.url));
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Allow auth logic API routes without checking token
  if (path.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const isPublicPath = path === '/login';

  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token) {
    const payload = await verifyToken(token);
    if (!payload) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('shopfloor_token');
      return response;
    }

    if (isPublicPath) {
      if (payload.role === 'OPERATOR') return NextResponse.redirect(new URL('/employee', request.url));
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Role-based Path Protection
    if (path.startsWith('/dashboard') && payload.role === 'OPERATOR') {
      return NextResponse.redirect(new URL('/employee', request.url));
    }
    
    if (path.startsWith('/employee') && payload.role !== 'OPERATOR' && payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
