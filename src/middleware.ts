import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requireEnv } from "./lib/env";

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

// Routes that don't require authentication
const publicRoutes = ["/", "/auth/login", "/auth/signup", "/auth/callback", "/auth/error", "/auth/signout"];

// Routes that should redirect to /app if user is already authenticated
const authOnlyRoutes = ["/", "/auth/login", "/auth/signup"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value,
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value: "",
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value: "",
          ...options,
        });
      },
    },
  });

  const pathname = request.nextUrl.pathname;
  
  // Check if this is a public route first (before any async operations)
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith("/auth/")
  );

  // For public routes, just pass through without checking auth
  if (isPublicRoute) {
    return response;
  }

  // Refresh session - use getSession() which reads from JWT cookie (faster, no network request)
  // Then call getUser() only if we have a session to validate it
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  // Debug: log auth state for protected routes
  if (!pathname.startsWith("/api")) {
    console.log("[middleware]", pathname, session?.user ? `user:${session.user.id.slice(0,8)}` : "no-session", sessionError?.message || "");
  }

  const user = session?.user;

  // If user is authenticated and on an auth-only route, redirect to /app
  if (user && authOnlyRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  // If user is not authenticated and trying to access a protected route
  if (!user) {
    const redirectUrl = new URL("/auth/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
