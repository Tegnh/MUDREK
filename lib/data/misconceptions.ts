import type { Misconception } from "./types";

/**
 * كتالوج المفاهيم الخاطئة. في التشخيص الحقيقي يبنيه Gemini من ورقة الإجابة
 * ومن الأسئلة المولَّدة؛ هنا كتالوج تمهيدي ثابت تُحال إليه معرّفات الأسئلة.
 */
export const MISCONCEPTIONS: Misconception[] = [
  {
    id: "m-frac-denom",
    concept: "توحيد المقامات",
    description: "يجمع البسوط مباشرة دون توحيد المقامات أولًا.",
  },
  {
    id: "m-frac-simplify",
    concept: "تبسيط الكسور",
    description: "يترك الكسر الناتج دون اختزاله إلى أبسط صورة.",
  },
  {
    id: "m-lin-sign",
    concept: "نقل الحدود وتغيير الإشارة",
    description: "ينسى قلب إشارة الحد عند نقله من طرف المعادلة إلى الآخر.",
  },
  {
    id: "m-lin-divide",
    concept: "القسمة على معامل المجهول",
    description: "يقسم طرفًا واحدًا فقط من المعادلة على معامل المجهول.",
  },
  {
    id: "m-geo-ratio",
    concept: "المتتاليات الهندسية",
    description:
      "يخلط بين النسبة الثابتة والفرق الثابت، فيطبّق منطق المتتالية الحسابية على متتالية هندسية.",
  },
  {
    id: "m-geo-sign",
    concept: "المتتاليات الهندسية",
    description: "يهمل إشارة النسبة السالبة، فتنقلب إشارات الحدود المتتالية.",
  },
  {
    id: "m-quad-factor",
    concept: "المعادلات التربيعية",
    description: "يفترض أن حاصل ضرب عاملين يساوي صفرًا يعني أن كليهما صفر دون التحقق.",
  },
  {
    id: "m-tri-angle-sum",
    concept: "زوايا المثلث",
    description: "لا يستخدم كون مجموع زوايا المثلث ١٨٠° للتحقق من صحة الحل.",
  },
  {
    id: "m-general-review",
    concept: "مراجعة عامة",
    description: "يحتاج مراجعة عامة لهذا القسم — لا مفهوم محدد بعد.",
  },
];

export function findMisconception(id: string | null): Misconception | undefined {
  if (!id) return undefined;
  return MISCONCEPTIONS.find((m) => m.id === id);
}

/** {misconception_id → الوصف}، صيغة الكتالوج التي يتوقّعها generateQuiz. */
export function misconceptionCatalogRecord(): Record<string, string> {
  return Object.fromEntries(MISCONCEPTIONS.map((m) => [m.id, `${m.concept}: ${m.description}`]));
}
