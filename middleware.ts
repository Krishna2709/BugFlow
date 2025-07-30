import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Allow access to public routes
    if (
      pathname.startsWith('/api/reports/submit') ||
      pathname.startsWith('/submit') ||
      pathname.startsWith('/auth') ||
      pathname === '/' ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/favicon')
    ) {
      return NextResponse.next()
    }

    // Check if user is authenticated
    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }

    // Role-based access control
    const userRole = token.role as string

    // Admin routes
    if (pathname.startsWith('/admin')) {
      if (userRole !== 'ADMIN') {
        return NextResponse.redirect(new URL('/unauthorized', req.url))
      }
    }

    // Engineer routes
    if (pathname.startsWith('/engineer')) {
      if (userRole !== 'ENGINEER' && userRole !== 'ADMIN') {
        return NextResponse.redirect(new URL('/unauthorized', req.url))
      }
    }

    // Viewer routes
    if (pathname.startsWith('/viewer')) {
      if (!['VIEWER', 'ENGINEER', 'ADMIN'].includes(userRole)) {
        return NextResponse.redirect(new URL('/unauthorized', req.url))
      }
    }

    // API routes protection
    if (pathname.startsWith('/api/')) {
      // Skip auth routes and public submit route
      if (
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/api/reports/submit')
      ) {
        return NextResponse.next()
      }

      // Require authentication for other API routes
      if (!token) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      // Admin-only API routes
      if (
        pathname.startsWith('/api/users') ||
        pathname.startsWith('/api/admin')
      ) {
        if (userRole !== 'ADMIN') {
          return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403 }
          )
        }
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Allow public routes without token
        if (
          pathname.startsWith('/api/reports/submit') ||
          pathname.startsWith('/submit') ||
          pathname.startsWith('/auth') ||
          pathname === '/' ||
          pathname.startsWith('/_next') ||
          pathname.startsWith('/favicon')
        ) {
          return true
        }

        // Require token for protected routes
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}