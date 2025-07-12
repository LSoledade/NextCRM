import { createClient } from '@/utils/supabase/middleware'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    // Create a Supabase client configured to use cookies
    const { supabase, response } = createClient(request)

    // Get the pathname
    const pathname = request.nextUrl.pathname

    // Skip auth check for public routes
    const publicRoutes = ['/login', '/auth/confirm', '/auth/signout', '/auth/auth-code-error']
    if (publicRoutes.includes(pathname)) {
      return response
    }

    // Try to get user session
    const { data: { user }, error } = await supabase.auth.getUser()

    // If there's an auth error or no user, redirect to login
    if (error || !user) {
      // Clear any existing auth cookies
      const loginUrl = new URL('/login', request.url)
      const redirectResponse = NextResponse.redirect(loginUrl)
      
      // Clear auth-related cookies
      const cookiesToClear = [
        'sb-access-token',
        'sb-refresh-token',
        'supabase-auth-token',
        'supabase.auth.token'
      ]
      
      cookiesToClear.forEach(cookieName => {
        redirectResponse.cookies.delete(cookieName)
      })
      
      return redirectResponse
    }

    return response
  } catch (e) {
    console.error('Middleware error:', e)
    
    // If we're not already on a public route, redirect to login
    const pathname = request.nextUrl.pathname
    const publicRoutes = ['/login', '/auth/confirm', '/auth/signout', '/auth/auth-code-error']
    
    if (!publicRoutes.includes(pathname)) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
    
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
