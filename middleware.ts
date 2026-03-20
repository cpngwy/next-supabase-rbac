import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { isAdminForUser } from "@/lib/adminCheck";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/roles") ||
    pathname.startsWith("/profile");

  if (!isProtected) return NextResponse.next();

  const response = NextResponse.next();
  const supabase = createSupabaseServerClient(request, response);

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const userId = userData.user.id;

  const isAdminRoute = pathname.startsWith("/users") || pathname.startsWith("/roles");
  if (isAdminRoute) {
    const ok = await isAdminForUser(supabase, userId);
    if (!ok) {
      const dashboardUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/users/:path*", "/roles/:path*", "/profile/:path*"],
};

