import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";

/**
 * عميل بصلاحية service_role — يتجاوز RLS بالكامل.
 * للاستخدام حصرًا من كود خادمي موثوق (مهام الذكاء الاصطناعي، التذكيرات
 * المجدولة). لا تستورده أبدًا في مكوّن عميل أو مسار متاح للمتصفح.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
