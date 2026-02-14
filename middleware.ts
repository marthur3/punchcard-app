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
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  // Check demo mode - if demo mode, allow all routes
  if (process.env.ENABLE_DEMO_MODE === 'true') {
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
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      loginUrl.searchParams.set('type', 'business');
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
