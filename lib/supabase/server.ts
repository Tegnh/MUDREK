import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/db";

/**
 * عميل Supabase لمكوّنات الخادم وServer Actions.
 * الكتابة على الكوكيز قد تفشل داخل مكوّن خادم صرف (لا بأس، middleware.ts
 * هو من يحدّث الجلسة فعليًا في تلك الحالة).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // استُدعيت من Server Component؛ متروكة لـ middleware.
          }
        },
      },
    },
  );
}
