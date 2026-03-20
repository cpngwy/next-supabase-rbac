import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "local-anon-key";

/**
 * Supabase server client wired to the Next.js request/response cookies.
 * This is required for reliable session persistence with @supabase/ssr.
 */
export function createSupabaseServerClient(
  request: NextRequest,
  response?: NextResponse,
) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => {
        return request.cookies.getAll().map((c) => ({
          name: c.name,
          value: c.value,
        }));
      },
      ...(response
        ? {
            setAll: (cookies: { name: string; value: string; options: any }[]) => {
              for (const cookie of cookies) {
                // Next expects cookie name/value + serialize options.
                response.cookies.set(
                  cookie.name,
                  cookie.value,
                  cookie.options,
                );
              }
            },
          }
        : null),
    },
  });
}

