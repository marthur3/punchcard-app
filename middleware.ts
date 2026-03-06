import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require customer authentication
const PROTECTED_CUSTOMER_ROUTES = ['/dashboard'];

// Routes that require business admin authentication
const PROTECTED_ADMIN_ROUTES = ['/business'];

// Routes that require super admin authentication
const PROTECTED_SUPER_ADMIN_ROUTES = ['/admin'];

// Routes that are always public
const PUBLIC_ROUTES = [
  '/',
  '/auth/login',
  '/auth/register',
  '/tap',
  '/business/signup',
  '/business/onboarding',
  '/business/login',
  '/leaderboard',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // HTTPS enforcement for Heroku (X-Forwarded-Proto header)
  if (process.env.NODE_ENV === 'production') {
    const proto = request.headers.get('x-forwarded-proto');
    if (proto && proto !== 'https') {
      const httpsUrl = request.url.replace(/^http:/, 'https:');
      return NextResponse.redirect(httpsUrl, 301);
    }
  }

  // Skip API routes, static files, and public assets
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/icons/') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next();
  }

  // Check if route is explicitly public
  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
  if (isPublic) {
    return NextResponse.next();
  }

  // Demo mode: no Supabase configured OR explicitly enabled — bypass cookie auth
  // (demo mode uses localStorage auth on the client, not httpOnly cookies)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isDemoMode =
    !supabaseUrl ||
    supabaseUrl === 'https://demo.supabase.co' ||
    process.env.ENABLE_DEMO_MODE === 'true';

  if (isDemoMode) {
    return NextResponse.next();
  }

  // Check customer protected routes
  const isProtectedCustomer = PROTECTED_CUSTOMER_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
  if (isProtectedCustomer) {
    const authToken = request.cookies.get('auth_token');
    if (!authToken?.value) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Check admin protected routes
  const isProtectedAdmin = PROTECTED_ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
  if (isProtectedAdmin) {
    const adminToken = request.cookies.get('admin_token');
    if (!adminToken?.value) {
      const loginUrl = new URL('/business/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Check super admin routes
  const isSuperAdmin = PROTECTED_SUPER_ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
  if (isSuperAdmin) {
    const authToken = request.cookies.get('auth_token');
    if (!authToken?.value) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files and api
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|offline.html|robots.txt|sitemap.xml).*)',
  ],
};
