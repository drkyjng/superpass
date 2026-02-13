import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        res.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        res.cookies.set({ name, value: "", ...options });
      }
    }
  });

  const { data } = await supabase.auth.getUser();
  const isAuthed = !!data.user;

  const pathname = req.nextUrl.pathname;

  // Public routes
  const publicPaths = ["/login", "/auth/callback", "/favicon.ico"];
  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!isAuthed && !isPublic) {
    const redirectUrl = new URL("/login", req.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthed && pathname === "/login") {
    return NextResponse.redirect(new URL("/browse", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\.(?:png|jpg|jpeg|gif|webp|svg|ico)).*)"]
};
