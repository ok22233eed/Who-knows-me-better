import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// For Server Components / Route Handlers that need to act AS the
// current visitor's session (e.g. the /api/start-participation proxy,
// which needs auth.uid() to resolve inside the RPC it calls). Never
// used with a service-role key — this app has none; every write goes
// through the SECURITY DEFINER RPCs in the schema, which is the whole
// point of that design.
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render — safe to ignore,
          // middleware.ts refreshes the session on the next request.
        }
      },
    },
  });
}
