import { NextResponse, type NextRequest } from "next/server";
import { runReminderSweep } from "@/lib/reminders/run";

/**
 * المهمة المجدولة اليومية — ١٨:٠٠ بتوقيت الرياض.
 *
 * جدولة Vercel بـ UTC دائمًا، فالتعبير في vercel.json هو `0 15 * * *`:
 * الرياض UTC+3 بلا توقيت صيفي، فالإزاحة ثابتة ولا تحتاج تصحيحًا موسميًا.
 * (JSON لا يحتمل تعليقًا، ولهذا التوضيح هنا.)
 *
 * المسار خارج matcher في middleware.ts عمدًا: لا جلسة هنا ولا مستخدم، والحارس
 * سرٌّ مشترك لا كوكي. Vercel Cron يُرسل GET حاملًا CRON_SECRET في ترويسة
 * Authorization إن كان المتغيّر مضبوطًا.
 *
 * التشغيل اليدوي من /admin/cron لا يمرّ من هنا أصلًا — ينادي runReminderSweep
 * مباشرة عبر Server Action محميّ بدور المعلم، فلا حاجة لكشف السرّ في المتصفح.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;

  // بلا سرّ مضبوط: مسموح في التطوير المحلي فقط. على Vercel بلا CRON_SECRET
  // يصبح المسار مفتوحًا للعالم — فيُغلق بدل أن يعمل بلا حماية.
  if (!secret) return process.env.NODE_ENV !== "production";

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  }

  try {
    const report = await runReminderSweep();
    return NextResponse.json({
      ok: true,
      day: report.day,
      dryRun: report.dryRun,
      studentsScanned: report.studentsScanned,
      sent: report.sent,
      skipped: report.skipped,
      failed: report.failed,
    });
  } catch (e) {
    const error = e instanceof Error ? e.message : "تعذّر تشغيل مهمة التذكيرات.";
    console.error("[reminders] فشل الكنس:", error);
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}
