import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const APP_PREFIXES = ["/dashboard", "/jobs", "/applications", "/autopilot", "/profile", "/settings"];

// Refreshes the Supabase session cookie on every request and sends
// signed-out visitors of app pages to /login.
export async function proxy(request: NextRequest) {
  // Pages opened on the old Railway address move to the site's own domain.
  // (API routes are not matched, so older extension installs keep working there.)
  const site = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : null;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  if (site && host.endsWith(".up.railway.app") && host !== site.host) {
    return NextResponse.redirect(new URL(request.nextUrl.pathname + request.nextUrl.search, site.origin), 308);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && APP_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
