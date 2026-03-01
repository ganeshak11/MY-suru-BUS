import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname === '/login';
  
  // Skip middleware for login page - let client-side handle auth check
  if (isLoginPage) {
    return NextResponse.next();
  }

  // For protected pages, redirect to login (client will check sessionStorage)
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.png).*)'],
};
