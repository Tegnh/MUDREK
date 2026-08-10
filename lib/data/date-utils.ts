/** أدوات تواريخ محلّية صغيرة يستخدمها عدّاد الالتزام. */

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function daysAgoKey(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateKey(d);
}

/**
 * مفتاح اليوم بتوقيت الرياض لا بتوقيت الخادم.
 *
 * على Vercel يعمل الخادم بـ UTC، فطالب يذاكر الواحدة صباحًا بتوقيت الرياض كان
 * يُحسَب على اليوم السابق — يكسر سلسلته وهو ملتزم. «اليوم» في هذا المنتج يوم
 * الطالب، ولا صيف/شتاء في السعودية فالإزاحة ثابتة على +٣.
 */
export const RIYADH_TZ = "Asia/Riyadh";

export function riyadhDateKey(d: Date = new Date()): string {
  // en-CA تُخرج ISO (YYYY-MM-DD) مباشرة، فلا تركيب يدوي للأجزاء.
  return new Intl.DateTimeFormat("en-CA", { timeZone: RIYADH_TZ }).format(d);
}

/** فرق الأيام بين مفتاحي تاريخ (b - a)، بالأيام الكاملة. */
export function dayDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const da = Date.UTC(ay, am - 1, ad);
  const db = Date.UTC(by, bm - 1, bd);
  return Math.round((db - da) / 86_400_000);
}
