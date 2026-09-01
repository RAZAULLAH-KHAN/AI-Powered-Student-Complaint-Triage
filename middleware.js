import { updateSession } from '@/lib/supabase/middleware';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  const url = request.nextUrl.clone();
  const rawPath = url.pathname;

  // Clean trailing spaces, newlines (%0A, %0D), or control characters from Postman URLs
  const cleanPath = rawPath.replace(/[\s\r\n]+$/g, '').replace(/(%0A|%0D)+$/gi, '');

  if (rawPath !== cleanPath) {
    url.pathname = cleanPath;
    return NextResponse.redirect(url);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
