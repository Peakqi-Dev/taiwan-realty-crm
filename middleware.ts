import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon, fonts, image asset extensions
     * - API routes (handled separately by their own auth checks)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|icon$|apple-icon$|.*\\.(?:png|svg|jpg|jpeg|gif|webp|woff2?|ico)$).*)",
  ],
};
