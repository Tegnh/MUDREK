import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

/**
 * المسارات المحمية ومسارات المصادقة فقط.
 *
 * كان النمط السابق شاملًا لكل الموقع باستثناء الأصول الساكنة، فكان كل طلب —
 * بما فيه صفحة الهبوط المفتوحة للجميع و/design — يدفع ثمن نداء
 * supabase.auth.getUser() عبر الشبكة قبل أن يُعرض أي شيء. هذه الصفحات لا
 * تقرأ الجلسة أصلًا، فلا شيء يُكسب من تحديثها لها.
 *
 * ملاحظة عند إضافة مسار محمي جديد: أضِفه هنا، وإلا لن يمرّ بأي فحص.
 */
export const config = {
  // /api/cron/* عمدًا خارج القائمة: لا جلسة فيه، وحارسه سرٌّ مشترك لا كوكي.
  matcher: ["/t/:path*", "/s/:path*", "/admin/:path*", "/login", "/signup", "/auth/:path*"],
};
