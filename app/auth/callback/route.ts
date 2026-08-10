import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** يستبدل رمز Magic Link بجلسة، ثم يترك middleware.ts يوجّه حسب الدور. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  // الوجهة الافتراضية /login عمدًا لا "/": صفحة الهبوط مفتوحة للجميع فلا
  // يُوجَّه منها أحد، بينما /login مسار مصادقة يعيد middleware المستخدم منه
  // إلى نافذته حسب users.role — فيبقى الدور هو من يقرّر الوجهة، لا الرابط.
  const next = searchParams.get("next") ?? "/login";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
