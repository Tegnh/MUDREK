import type { QuizQuestion } from "./types";
import { generateQuiz } from "@/lib/ai/generateQuiz";
import { fallbackGenerateQuiz } from "@/lib/ai/fallback";
import { misconceptionCatalogRecord } from "./misconceptions";
import { getSectionRaw, setSectionQuiz } from "./store";

/**
 * توليد اختبار القسم عند الطلب.
 *
 * هذا نصف الحلّ الآخر لبطء الرفع: الرفع لم يعد يولّد شيئًا، وهنا يُولَّد
 * اختبارُ القسم أوّل مرّة يُفتح فيها فقط ثم يُخزَّن. النتيجة أن الطالب ينتظر
 * ~١٥ ثانية مرّة واحدة عند القسم الذي اختاره فعلًا، بدل خمس دقائق مقدَّمًا
 * لأقسامٍ أغلبها لن يُفتح في تلك الجلسة.
 *
 * خريطة الوعود المُعلَّقة ليست تحسينًا للسرعة بل شرطُ صحّة: صفحة الدرس
 * وطلبُ التسخين المسبق من صفحة المسار قد يصلان في اللحظة نفسها لنفس القسم،
 * وبدونها يُنادى النموذج مرّتين وتفوز إحدى النتيجتين عشوائيًا — أي اختباران
 * مختلفان لقسم واحد بحسب أيّهما كتب أخيرًا.
 */

const g = globalThis as unknown as { __mudrikQuizInFlight?: Map<string, Promise<QuizQuestion[]>> };
const inFlight = (g.__mudrikQuizInFlight ??= new Map());

const QUESTIONS_PER_SECTION = 4;

async function generateAndStore(sectionId: string): Promise<QuizQuestion[]> {
  const section = getSectionRaw(sectionId);
  if (!section) throw new Error("القسم غير موجود.");

  let quiz: QuizQuestion[];
  try {
    const out = await generateQuiz(
      section.content_md,
      QUESTIONS_PER_SECTION,
      misconceptionCatalogRecord(),
    );
    quiz = out.questions;
  } catch {
    quiz = fallbackGenerateQuiz(section.title, section.key_concepts).questions;
  }

  setSectionQuiz(sectionId, quiz);
  return quiz;
}

/**
 * يُعيد اختبار القسم، مُولِّدًا إياه إن لم يكن موجودًا.
 * نداءان متزامنان لنفس القسم يتشاركان توليدًا واحدًا.
 */
export function ensureSectionQuiz(sectionId: string): Promise<QuizQuestion[]> {
  const existing = getSectionRaw(sectionId)?.quiz;
  if (existing && existing.length > 0) return Promise.resolve(existing);

  const pending = inFlight.get(sectionId);
  if (pending) return pending;

  const promise = generateAndStore(sectionId).finally(() => inFlight.delete(sectionId));
  inFlight.set(sectionId, promise);
  return promise;
}

/**
 * تسخين مسبق لا ينتظره أحد: يُطلق التوليد ويبتلع الخطأ.
 * تُنادى من صفحة المسار للقسم التالي، فيغلب أن يكون جاهزًا قبل أن يضغطه الطالب.
 */
export function warmSectionQuiz(sectionId: string): void {
  void ensureSectionQuiz(sectionId).catch(() => {});
}
