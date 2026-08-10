/**
 * إرسال البريد عبر Resend.
 *
 * يُنادى REST مباشرة بـ fetch بدل حزمة `resend`: النداء طلب POST واحد بجسم
 * JSON، والحزمة تضيف تبعية كاملة مقابل ذلك. الأهم أن هذا يبقى قابلًا للبناء
 * والتشغيل في بيئة بلا وصول إلى npm.
 *
 * بلا RESEND_API_KEY لا يفشل شيء: يعمل النظام في وضع «جفاف» يُظهر الرسالة في
 * السجلّ ويعيد dryRun. مسار المتابعة كله يبقى قابلًا للاختبار من أول تشغيل،
 * تمامًا كما يفعل lib/ai/fallback.ts مع طبقة الذكاء الاصطناعي.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** نطاق Resend التجريبي يرسل إلى بريد صاحب الحساب فقط — يكفي للعرض، لا للإنتاج. */
const DEFAULT_FROM = "مُدرِك <onboarding@resend.dev>";

export type SendResult =
  | { ok: true; dryRun: boolean; id: string | null }
  | { ok: false; error: string };

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  /** نسخة نصّية — بعض عملاء البريد لا يعرضون HTML، ووجودها يحسّن التسليم. */
  text: string;
};

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || DEFAULT_FROM;

  if (!apiKey) {
    console.info(`[reminders] وضع الجفاف — إلى ${message.to}: ${message.subject}`);
    return { ok: true, dryRun: true, id: null };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return { ok: false, error: `Resend ${response.status}: ${body.slice(0, 300)}` };
    }

    const data = (await response.json()) as { id?: string };
    return { ok: true, dryRun: false, id: data.id ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "تعذّر الاتصال بـ Resend." };
  }
}
