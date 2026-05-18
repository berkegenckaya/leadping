import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PREFIXES   = ["/api/widget/", "/api/auth/", "/portal/"];
const ADMIN_API_PREFIX  = "/api/admin";
const AUTH_PAGES        = ["/login", "/register"];
const ADMIN_PREFIXES    = ["/admin"];
const DASHBOARD_PREFIXES = ["/dashboard"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const supabaseKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "" });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const { data: { session } } = await supabase.auth.getSession();

  const isAdminApiRoute  = pathname.startsWith(ADMIN_API_PREFIX);
  const isAdminRoute     = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));
  const isDashboardRoute = DASHBOARD_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPage       = AUTH_PAGES.some((p) => pathname.startsWith(p));
  const isProtected      = isAdminRoute || isDashboardRoute;

  // /api/admin/* → oturum yoksa 401, SUPER_ADMIN değilse 403
  if (isAdminApiRoute) {
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = session.user.app_metadata?.["role"] as string | undefined;
    if (role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return response;
  }

  // Oturum yoksa login'e yönlendir
  if (isProtected && !session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isProtected && session) {
    const role = session.user.app_metadata?.["role"] as string | undefined;

    // /admin/* → yalnızca SUPER_ADMIN
    if (isAdminRoute && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    // /dashboard/* → SUPER_ADMIN bu alana giremez
    if (isDashboardRoute && role === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  // Oturum açıkken auth sayfalarına erişim
  if (isAuthPage && session) {
    const role = session.user.app_metadata?.["role"] as string | undefined;
    const target = role === "SUPER_ADMIN" ? "/admin" : "/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
