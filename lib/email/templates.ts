import type { Database } from "@/types/db";
import type { EmailMessage } from "./send";

/**
 * قوالب رسائل المتابعة.
 *
 * ثلاث قواعد قرارية في المحرّك، وثلاث رسائل هنا — واحدة لكل قاعدة، ولا رسالة
 * عامة «للتحفيز» بلا سبب محدَّد خلفها.
 *
 * النبرة: جملة سبب، جملة كلفة، زر واحد. لا علامات تعجب، لا إيموجي، ولا أي
 * ادّعاء عن أثر النظام على الالتزام — ما يُذكر في الرسالة حالةُ الطالب نفسه
 * كما هي مسجَّلة، لا وعد بنتيجة.
 *
 * كل التنسيق مضمَّن سطريًا (inline): عملاء البريد — Gmail أولهم — يُسقطون
 * <style> والـ classes، ويقصّون أي CSS خارجي. والتخطيط بجداول لا بـ flex
 * للسبب نفسه (Outlook على Word engine).
 */

export type ReminderType = Database["public"]["Enums"]["reminder_type"];

/** القالب لا يعرف المرسَل إليه — المحرّك يضيف `to` عند الإرسال. */
export type ReminderTemplate = Omit<EmailMessage, "to">;

/* ────────────────────────────── ألوان الهوية ────────────────────────────── */
/* منسوخة من app/globals.css — لا متغيّرات CSS في البريد. */

const INK = "#101e2b";
const SURFACE = "#faf7f2";
const PAPER = "#fffdf9";
const LINE = "#e8e0d6";
const MUTED = "#6b7c8c";
const ACCENT = "#f0722c";

const FONT = "'Segoe UI', Tahoma, Arial, 'Helvetica Neue', sans-serif";

/* ────────────────────────────── أدوات ────────────────────────────── */

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** تمييز المثنى وجمع القلّة عن جمع الكثرة — «٢ أيام» و«١٢ أيام» كلاهما خطأ. */
function days(n: number): string {
  if (n === 1) return "يوم واحد";
  if (n === 2) return "يومان";
  if (n >= 3 && n <= 10) return `${n} أيام`;
  return `${n} يومًا`;
}

function siteUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}${path}`;
}

/* ────────────────────────────── الهيكل المشترك ────────────────────────────── */

type ShellInput = {
  /** نصّ المعاينة في صندوق الوارد قبل الفتح. */
  preheader: string;
  heading: string;
  paragraphs: string[];
  ctaLabel: string;
  ctaPath: string;
  /** شريط الفجوة البرتقالي — للرسالة التي تعلّم نقصًا رصده المعلم فقط. */
  flagged?: boolean;
};

function shell(input: ShellInput): string {
  const { preheader, heading, paragraphs, ctaLabel, ctaPath, flagged = false } = input;
  const href = siteUrl(ctaPath);

  const body = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.75;color:${INK};">${p}</p>`,
    )
    .join("");

  const flagBar = flagged
    ? `<tr><td style="height:3px;background-color:${ACCENT};font-size:0;line-height:0;">&nbsp;</td></tr>`
    : "";

  return `<div dir="rtl" lang="ar" style="margin:0;padding:0;background-color:${SURFACE};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${SURFACE};padding:32px 16px;font-family:${FONT};">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:${PAPER};border:1px solid ${LINE};border-radius:12px;overflow:hidden;">
        ${flagBar}
        <tr>
          <td style="padding:28px 28px 8px;" dir="rtl">
            <div style="font-size:12px;font-weight:700;letter-spacing:0.16em;color:${MUTED};">مُدرِك</div>
            <h1 style="margin:14px 0 16px;font-size:20px;font-weight:700;line-height:1.35;color:${INK};">${esc(heading)}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px;" dir="rtl">${body}</td>
        </tr>
        <tr>
          <td style="padding:12px 28px 30px;" dir="rtl">
            <a href="${esc(href)}" style="display:inline-block;background-color:${INK};color:${SURFACE};text-decoration:none;font-size:14px;font-weight:600;padding:13px 26px;border-radius:12px;">${esc(ctaLabel)}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px;border-top:1px solid ${LINE};background-color:${SURFACE};" dir="rtl">
            <p style="margin:0;font-size:12px;line-height:1.7;color:${MUTED};">
              رسالة متابعة آلية من مُدرِك. لا تُرسَل أكثر من رسالة واحدة في اليوم.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</div>`;
}

/** نسخة نصّية بسيطة — لا تُشتقّ من HTML، تُكتب صراحةً لتبقى مقروءة. */
function plain(heading: string, lines: string[], ctaLabel: string, ctaPath: string): string {
  return [heading, "", ...lines, "", `${ctaLabel}: ${siteUrl(ctaPath)}`, "", "مُدرِك — رسالة متابعة آلية."].join(
    "\n",
  );
}

/* ────────────────────────────── القوالب الثلاثة ────────────────────────────── */

/** رُفع ملف ومضى يوم دون أن يُفتح أي قسم منه. */
export function notStartedEmail(params: { fileLabel: string }): ReminderTemplate {
  const label = params.fileLabel;
  const heading = "ملفك ما زال بلا بداية";
  const lines = [
    `رفعت «${label}» أمس، ولم يُفتح منه قسم واحد بعد.`,
    "القسم الأول يستغرق نحو ثلاث دقائق، وبعده تُفتح بقية الأقسام.",
  ];

  return {
    subject: `«${label}» ما زال بلا بداية`,
    html: shell({
      preheader: `رفعت ${label} أمس ولم تفتح قسمه الأول.`,
      heading,
      paragraphs: [
        `رفعت <strong style="font-weight:600;">«${esc(label)}»</strong> أمس، ولم يُفتح منه قسم واحد بعد.`,
        "القسم الأول يستغرق نحو ثلاث دقائق، وبعده تُفتح بقية الأقسام.",
      ],
      ctaLabel: "افتح القسم الأول",
      ctaPath: "/s",
    }),
    text: plain(heading, lines, "افتح القسم الأول", "/s"),
  };
}

/**
 * انقطاع ٤٨ ساعة وسلسلة بلغت ٣ أيام فأكثر.
 *
 * الصياغة بالماضي («توقّفت») لا بالتحذير («ستنكسر»): يومان كاملان بلا نشاط
 * يكسران السلسلة فعلًا بتعريف lib/streak.ts، فالتلويح بإنقاذها وعدٌ كاذب.
 * ما يصحّ عرضه هو الرقم الذي بلغه الطالب وأطول سلسلة سجّلها.
 */
export function streakAtRiskEmail(params: { current: number; longest: number }): ReminderTemplate {
  const heading = "لم تُسجَّل حركة في حسابك منذ يومين";
  const lines = [
    `بلغت سلسلة التزامك ${days(params.current)} متتالية قبل أن تتوقّف.`,
    `أطول سلسلة سجّلتها حتى الآن ${days(params.longest)}. قسم واحد اليوم يبدأ سلسلة جديدة.`,
  ];

  return {
    subject: "لم تُسجَّل حركة في حسابك منذ يومين",
    html: shell({
      preheader: `سلسلتك توقّفت عند ${days(params.current)}.`,
      heading,
      paragraphs: [
        `بلغت سلسلة التزامك <strong style="font-weight:600;">${days(params.current)}</strong> متتالية قبل أن تتوقّف.`,
        `أطول سلسلة سجّلتها حتى الآن ${days(params.longest)}. قسم واحد اليوم يبدأ سلسلة جديدة.`,
      ],
      ctaLabel: "تابع من حيث توقفت",
      ctaPath: "/s",
    }),
    text: plain(heading, lines, "تابع من حيث توقفت", "/s"),
  };
}

/**
 * أقوى الثلاثة: خلف هذه الرسالة معلّم رصد الضعف بنفسه وأرسل تمرينه.
 * لذلك وحدها تحمل الشريط البرتقالي — البطاقة تعلّم نقصًا مقيسًا لا تحفّز.
 */
export function gapUnresolvedEmail(params: { conceptLabel: string }): ReminderTemplate {
  const label = params.conceptLabel;
  const heading = "تمرين موجّه من معلّمك ينتظرك";
  const lines = [
    `رصد معلّمك ضعفًا في «${label}» من ورقة اختبارك، وأرسل لك تمرينًا موجّهًا له أمس.`,
    "لم يُفتح بعد.",
  ];

  return {
    subject: `تمرين موجّه من معلّمك: ${label}`,
    html: shell({
      preheader: `تمرين ${label} الذي أرسله معلّمك لم يُفتح بعد.`,
      heading,
      paragraphs: [
        `رصد معلّمك ضعفًا في <strong style="font-weight:600;">«${esc(label)}»</strong> من ورقة اختبارك، وأرسل لك تمرينًا موجّهًا له أمس.`,
        "لم يُفتح بعد.",
      ],
      ctaLabel: "افتح التمرين",
      ctaPath: "/s/gaps",
      flagged: true,
    }),
    text: plain(heading, lines, "افتح التمرين", "/s/gaps"),
  };
}
