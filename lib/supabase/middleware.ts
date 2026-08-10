import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/db";

/** مسارات المصادقة: متاحة للزائر، ويُعاد منها المستخدم المسجَّل إلى نافذته. */
const AUTH_PATHS = ["/login", "/signup", "/auth"];

type Role = Database["public"]["Enums"]["user_role"];

function normalizeRole(value: unknown): Role | null {
  return value === "teacher" || value === "student" ? value : null;
}

/**
 * يحدّث جلسة Supabase على المسارات المحمية ومسارات المصادقة فقط (انظر
 * matcher في middleware.ts)، ثم يوجّه حسب الدور: معلّم → /t، طالب → /s.
 *
 * لا يجري هنا أي تفويض حقيقي؛ الحارس الفعلي هو RLS في القاعدة وrequireRole
 * في الصفحات. مهمّة هذه الطبقة توفير رحلة ذهاب وإياب لمن يفتح الباب الخطأ.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthPath = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!user) {
    if (isAuthPath) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  /*
    الدور من مطالبات التوكن أوّلًا (يكتبها مشغّل sync_role_to_app_metadata في
    هجرة 003، ولا سبيل للعميل إلى تعديل app_metadata). هذا يلغي استعلامًا على
    قاعدة البيانات كان يجري في *كل* طلب محمي قبل عرض أي بايت.

    القراءة من public.users تبقى كمسار احتياطي لحساب أقدم من الهجرة فقط.
  */
  let role = normalizeRole(user.app_metadata?.role);
  if (!role) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = profile?.role ?? null;
  }

  // بلا ملف تعريف بعد: تتكفّل به getProfile داخل الصفحة (ensureProfile).
  if (!role) return response;

  const home = role === "teacher" ? "/t" : "/s";

  if (isAuthPath) {
    // مسار /auth/callback يجب أن يُكمل تبادل الرمز بنفسه قبل أي تحويل.
    if (pathname.startsWith("/auth/")) return response;
    const url = request.nextUrl.clone();
    url.pathname = home;
    url.search = "";
    return NextResponse.redirect(url);
  }

  const wantsTeacher = pathname.startsWith("/t");
  const wantsStudent = pathname.startsWith("/s");

  if ((wantsTeacher && role !== "teacher") || (wantsStudent && role !== "student")) {
    const url = request.nextUrl.clone();
    url.pathname = home;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
