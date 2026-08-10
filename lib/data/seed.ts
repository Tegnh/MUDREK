import type { Attempt, Diagnosis, QuizQuestion, SourceFile, SourceSection } from "./types";
import { daysAgoKey } from "./date-utils";

/**
 * بيانات تمهيدية لطالب تجريبي واحد. تحاكي حالة طالب رفع ملفًا منذ أيام،
 * وتقدّم في بعض أقسامه، وتلقّى تشخيصًا من معلمه — حتى تكون الصفحات الخمس
 * كلها ذات معنى من أول تشغيل، لا فارغة.
 */

let uid = 0;
const nextId = (prefix: string) => `${prefix}-${++uid}`;

function isoDaysAgo(n: number, hour = 18): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

/** يبني تعيين الخيارات الخاطئة بالتناوب على مجموعة معرّفات مفاهيم. */
function wrongMap(correctIndex: number, pool: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  let p = 0;
  for (let i = 0; i < 4; i++) {
    if (i === correctIndex) continue;
    map[String(i)] = pool[p % pool.length];
    p++;
  }
  return map;
}

function q(
  text: string,
  options: [string, string, string, string],
  correct_index: number,
  pool: string[],
): QuizQuestion {
  return { text, options, correct_index, misconception_id_per_wrong_option: wrongMap(correct_index, pool) };
}

/* ────────────────────── الملف الأول: الجبر — الصف الأول ────────────────────── */

const secFrac: SourceSection = {
  id: "sec-frac",
  fileId: "file-algebra",
  order_no: 1,
  title: "أساسيات الكسور",
  key_concepts: ["توحيد المقامات", "تبسيط الكسور"],
  content_md: `## جمع الكسور وطرحها

لا يمكن جمع كسرين أو طرحهما إلا بعد توحيد المقام. الخطوات:

1. أوجد المضاعف المشترك الأصغر للمقامين.
2. حوّل كل كسر إلى كسر مكافئ بهذا المقام.
3. اجمع البسوط أو اطرحها، واحتفظ بالمقام كما هو.
4. اختزل الناتج إلى أبسط صورة إن أمكن.

**مثال:** ١/٤ + ١/٦ = ٣/١٢ + ٢/١٢ = ٥/١٢.

### خطأ شائع
جمع البسوط والمقامات كل على حدة (١/٤ + ١/٦ = ٢/١٠) خطأ — الكسور ليست طرفين يُجمعان مباشرة.`,
  quiz: [
    q("ما ناتج ١/٤ + ١/٦ ؟", ["٢/١٠", "٥/١٢", "١/٥", "٧/١٢"], 1, ["m-frac-denom", "m-frac-simplify"]),
    q("ما ناتج ٢/٣ − ١/٦ ؟", ["١/٣", "١/٦", "١/٢", "٢/٣"], 2, ["m-frac-denom", "m-frac-simplify"]),
    q("ما أبسط صورة للكسر ٨/١٢ ؟", ["١/٢", "٨/١٢", "٢/٣", "٤/٦"], 2, ["m-frac-simplify", "m-frac-denom"]),
    q("ما ناتج ٣/٥ + ١/١٠ ؟", ["٤/١٥", "٧/١٠", "٣/٥٠", "٤/٥"], 1, ["m-frac-denom", "m-frac-simplify"]),
    q("أيّ كسر يساوي ٩/١٢ في أبسط صورة؟", ["٩/١٢", "٦/٨", "٣/٤", "١٨/٢٤"], 2, ["m-frac-simplify", "m-frac-denom"]),
    q("ما ناتج ١/٢ + ٢/٥ ؟", ["٣/١٠", "٣/٧", "١/١٠", "٩/١٠"], 3, ["m-frac-denom", "m-frac-simplify"]),
  ],
};

const secLinear: SourceSection = {
  id: "sec-linear",
  fileId: "file-algebra",
  order_no: 2,
  title: "المعادلات الخطية",
  key_concepts: ["نقل الحدود وتغيير الإشارة", "القسمة على معامل المجهول"],
  content_md: `## حل المعادلة الخطية بمجهول واحد

الهدف عزل المجهول في طرف واحد. القاعدة الذهبية: أي عملية تُجرى على طرف يجب أن تُجرى على الطرف الآخر أيضًا.

- عند نقل حدٍّ من طرف إلى آخر، **تنقلب إشارته**.
- للتخلّص من معامل يضرب المجهول، اقسم **طرفَي** المعادلة عليه، لا طرفًا واحدًا.

**مثال:** ٢س + ٣ = ١١ → ٢س = ١١ − ٣ = ٨ → س = ٤.`,
  quiz: [
    q("حل المعادلة: ٢س + ٣ = ١١", ["٧", "٤", "٥٫٥", "-٤"], 1, ["m-lin-sign", "m-lin-divide"]),
    q("حل المعادلة: ٥س − ٤ = ٢س + ٥", ["٣", "٩", "٣/٧", "-٣"], 0, ["m-lin-sign", "m-lin-divide"]),
    q("حل المعادلة: ٣(س − ٢) = ٩", ["٥", "٣", "١١/٣", "٧"], 0, ["m-lin-sign", "m-lin-divide"]),
    q("حل المعادلة: ٧ − س = ٢س + ١", ["٢", "٦", "-٢", "٨/٣"], 0, ["m-lin-sign", "m-lin-divide"]),
    q("حل المعادلة: س/٤ + ١ = ٤", ["١٢", "٣", "٢٠", "١٦"], 0, ["m-lin-divide", "m-lin-sign"]),
  ],
};

const secGeoSeq: SourceSection = {
  id: "sec-geo-seq",
  fileId: "file-algebra",
  order_no: 3,
  title: "المتتاليات الهندسية",
  key_concepts: ["المتتاليات الهندسية"],
  content_md: `## المتتالية الهندسية

كل حد يُنتَج بضرب الحد السابق في عدد ثابت يُسمّى **النسبة (ر)**. الحد العام:

**الحد(ن) = الحد الأول × ر^(ن−١)**

هذا يختلف عن المتتالية الحسابية التي يُضاف فيها فرق ثابت لا يُضرب.

### تنبيه
إذا كانت النسبة سالبة، تتناوب إشارات الحدود: موجب، سالب، موجب، ...`,
  quiz: [
    q("متتالية هندسية حدها الأول ٢ ونسبتها ٣. ما الحد الرابع؟", ["٥٤", "٢٤", "١٨", "٦"], 0, ["m-geo-ratio", "m-geo-sign"]),
    q("ما نسبة المتتالية: ٣، −٦، ١٢، −٢٤ ...؟", ["-٢", "٢", "-٣", "٣"], 0, ["m-geo-sign", "m-geo-ratio"]),
    q("الحد الأول ٥ والنسبة ١/٢. ما الحد الثالث؟", ["٥/٤", "٥/٢", "١٠", "١/٤"], 0, ["m-geo-ratio", "m-geo-sign"]),
    q("أيّ متتالية أدناه هندسية فعلًا؟", ["٢، ٤، ٨، ١٦", "٢، ٤، ٦، ٨", "١، ٣، ٥، ٧", "٢، ٥، ٨، ١١"], 0, ["m-geo-ratio", "m-geo-sign"]),
    q("الحد الأول ١٠٠ والنسبة −١. ما الحد الخامس؟", ["١٠٠", "-١٠٠", "٠", "٤"], 0, ["m-geo-sign", "m-geo-ratio"]),
  ],
};

const secQuad: SourceSection = {
  id: "sec-quad",
  fileId: "file-algebra",
  order_no: 4,
  title: "المعادلات التربيعية",
  key_concepts: ["حل المعادلات بالتحليل"],
  content_md: `## حل المعادلة التربيعية بالتحليل إلى عوامل

إذا كان حاصل ضرب عاملين يساوي صفرًا، فإن أحدهما على الأقل يساوي صفرًا (وليس بالضرورة كلاهما معًا).

**مثال:** (س − ٢)(س + ٣) = ٠ → س = ٢ أو س = −٣.`,
  quiz: [
    q("حل: (س − ٢)(س + ٣) = ٠", ["س = ٢ أو س = -٣", "س = ٢ فقط", "س = -٣ فقط", "س = ٦"], 0, ["m-quad-factor"]),
    q("حل: س² − ٩ = ٠", ["س = ٣ أو س = -٣", "س = ٩", "س = ٣ فقط", "س = -٩"], 0, ["m-quad-factor"]),
    q("حل: س² + ٥س = ٠", ["س = ٠ أو س = -٥", "س = ٥ فقط", "س = -٥ فقط", "لا يوجد حل"], 0, ["m-quad-factor"]),
    q("حل: (س − ١)(س − ١) = ٠", ["س = ١ (جذر مكرر)", "س = ١ أو س = -١", "س = ٠", "س = ٢"], 0, ["m-quad-factor"]),
  ],
};

const fileAlgebra: SourceFile = {
  id: "file-algebra",
  title: "الجبر — الصف الأول",
  subject: "الرياضيات",
  createdAt: isoDaysAgo(6),
  sectionIds: [secFrac.id, secLinear.id, secGeoSeq.id, secQuad.id],
};

/* ────────────────────── الملف الثاني: الهندسة — تمهيدي ────────────────────── */

const secTriAngles: SourceSection = {
  id: "sec-tri-angles",
  fileId: "file-geometry",
  order_no: 1,
  title: "زوايا المثلث",
  key_concepts: ["زوايا المثلث"],
  content_md: `## مجموع زوايا المثلث

مجموع زوايا أي مثلث يساوي دائمًا **١٨٠°**. هذه الحقيقة وحدها كافية لإيجاد أي زاوية مجهولة إذا عُرفت الزاويتان الأخريان، وللتحقق من صحة أي حل.`,
  quiz: [
    q("زوايا مثلث: ٥٠°، ٦٠°، والثالثة؟", ["٧٠°", "٦٠°", "١١٠°", "٥٠°"], 0, ["m-tri-angle-sum"]),
    q("مثلث متساوي الساقين، زاوية القاعدة ٤٠°. ما الزاوية الرأسية؟", ["١٠٠°", "٤٠°", "٨٠°", "٧٠°"], 0, ["m-tri-angle-sum"]),
    q("مثلث قائم الزاوية، إحدى الزاويتين الحادّتين ٣٥°. ما الأخرى؟", ["٥٥°", "٦٥°", "٤٥°", "٣٥°"], 0, ["m-tri-angle-sum"]),
    q("هل يمكن أن يملك مثلث زاويتين منفرجتين؟", ["لا، لأن المجموع يتجاوز ١٨٠°", "نعم دائمًا", "نعم إذا كان قائمًا", "لا يمكن تحديد ذلك"], 0, ["m-tri-angle-sum"]),
  ],
};

const secTriSimilar: SourceSection = {
  id: "sec-tri-similar",
  fileId: "file-geometry",
  order_no: 2,
  title: "تشابه المثلثات",
  key_concepts: ["تشابه المثلثات"],
  content_md: `## تشابه المثلثات

مثلثان متشابهان إذا تساوت زواياهما المتناظرة، وحينها تتناسب أضلاعهما المتناظرة بنفس النسبة. تكفي حالة تساوي زاويتين متناظرتين (ز.ز) لإثبات التشابه.`,
  quiz: [
    q("مثلثان متشابهان إذا تساوت زواياهما المتناظرة و…؟", ["تناسبت أضلاعهما المتناظرة", "تساوت أضلاعهما", "تساوت مساحتاهما", "تساوت محيطاهما"], 0, ["m-tri-angle-sum"]),
    q("مثلث أضلاعه ٣،٤،٥ وآخر يشابهه بمقياس رسم ٢. ما أضلاع الثاني؟", ["٦،٨،١٠", "٥،٦،٧", "٣،٤،٥", "١،٢،٣"], 0, ["m-tri-angle-sum"]),
    q("أيّ حالة تكفي لإثبات تشابه مثلثين؟", ["تساوي زاويتين متناظرتين (ز.ز)", "تساوي ضلع واحد فقط", "تساوي زاوية واحدة فقط", "تساوي محيطين"], 0, ["m-tri-angle-sum"]),
    q("نسبة التشابه بين مثلثين ١:٣، ومساحة الأصغر ٤. ما مساحة الأكبر؟", ["٣٦", "١٢", "٩", "٢٧"], 0, ["m-tri-angle-sum"]),
  ],
};

const secPythagoras: SourceSection = {
  id: "sec-pythagoras",
  fileId: "file-geometry",
  order_no: 3,
  title: "نظرية فيثاغورس",
  key_concepts: ["نظرية فيثاغورس"],
  content_md: `## نظرية فيثاغورس

في المثلث القائم الزاوية: **(الوتر)² = (ضلع)² + (ضلع)²**. تُستخدم لإيجاد ضلع مجهول، وللتحقق مما إذا كان مثلث ما قائم الزاوية أصلًا.`,
  quiz: [
    q("مثلث قائم ضلعاه القائمان ٣ و٤. ما طول الوتر؟", ["٥", "٧", "١٢", "٦"], 0, ["m-tri-angle-sum"]),
    q("الوتر ١٣ وأحد الضلعين ٥. ما الضلع الآخر؟", ["١٢", "٨", "١٨", "٦٨"], 0, ["m-tri-angle-sum"]),
    q("هل المثلث أضلاعه ٦،٨،١٠ قائم الزاوية؟", ["نعم، لأن ٦² + ٨² = ١٠²", "لا", "لا يمكن التحقق", "نعم لكن بتقريب فقط"], 0, ["m-tri-angle-sum"]),
    q("ضلعا القائمة ٦ و٦. ما طول الوتر تقريبًا؟", ["≈٨٫٥", "١٢", "٦", "≈١٠"], 0, ["m-tri-angle-sum"]),
  ],
};

const fileGeometry: SourceFile = {
  id: "file-geometry",
  title: "الهندسة — تمهيدي",
  subject: "الرياضيات",
  createdAt: isoDaysAgo(1),
  sectionIds: [secTriAngles.id, secTriSimilar.id, secPythagoras.id],
};

export const SEED_SECTIONS: SourceSection[] = [
  secFrac,
  secLinear,
  secGeoSeq,
  secQuad,
  secTriAngles,
  secTriSimilar,
  secPythagoras,
];

export const SEED_FILES: SourceFile[] = [fileAlgebra, fileGeometry];

/* ────────────────────── محاولات سابقة (تُنتج ٨٣٪ و٦٠٪) ────────────────────── */

export const SEED_ATTEMPTS: Attempt[] = [
  // أساسيات الكسور — ٥ من ٦ صحيحة (مُتقَن)
  { id: nextId("att"), sectionId: "sec-frac", fileId: "file-algebra", questionIndex: 0, selectedIndex: 1, isCorrect: true, misconceptionId: null, createdAt: isoDaysAgo(6) },
  { id: nextId("att"), sectionId: "sec-frac", fileId: "file-algebra", questionIndex: 1, selectedIndex: 2, isCorrect: true, misconceptionId: null, createdAt: isoDaysAgo(6) },
  { id: nextId("att"), sectionId: "sec-frac", fileId: "file-algebra", questionIndex: 2, selectedIndex: 0, isCorrect: false, misconceptionId: "m-frac-simplify", createdAt: isoDaysAgo(6) },
  { id: nextId("att"), sectionId: "sec-frac", fileId: "file-algebra", questionIndex: 3, selectedIndex: 1, isCorrect: true, misconceptionId: null, createdAt: isoDaysAgo(6) },
  { id: nextId("att"), sectionId: "sec-frac", fileId: "file-algebra", questionIndex: 4, selectedIndex: 2, isCorrect: true, misconceptionId: null, createdAt: isoDaysAgo(6) },
  { id: nextId("att"), sectionId: "sec-frac", fileId: "file-algebra", questionIndex: 5, selectedIndex: 3, isCorrect: true, misconceptionId: null, createdAt: isoDaysAgo(6) },

  // المعادلات الخطية — ٣ من ٥ صحيحة، والخامس لم يُجَب بعد (قيد التقدّم)
  { id: nextId("att"), sectionId: "sec-linear", fileId: "file-algebra", questionIndex: 0, selectedIndex: 1, isCorrect: true, misconceptionId: null, createdAt: isoDaysAgo(2) },
  { id: nextId("att"), sectionId: "sec-linear", fileId: "file-algebra", questionIndex: 1, selectedIndex: 1, isCorrect: false, misconceptionId: "m-lin-sign", createdAt: isoDaysAgo(2) },
  { id: nextId("att"), sectionId: "sec-linear", fileId: "file-algebra", questionIndex: 2, selectedIndex: 0, isCorrect: true, misconceptionId: null, createdAt: isoDaysAgo(2) },
  { id: nextId("att"), sectionId: "sec-linear", fileId: "file-algebra", questionIndex: 3, selectedIndex: 0, isCorrect: true, misconceptionId: null, createdAt: isoDaysAgo(1) },
];

/* ────────────────────── ما رصده المعلم (نافذة المعلم — خارج نطاق هذه الشاشات) ────────────────────── */

export const SEED_DIAGNOSES: Diagnosis[] = [
  {
    id: nextId("diag"),
    concept: "المتتاليات الهندسية",
    note: "أخطأ في أربعة من خمسة أسئلة عن النسبة الثابتة في ورقة الاختبار الأخيرة.",
    createdAt: isoDaysAgo(3),
  },
  {
    id: nextId("diag"),
    concept: "نقل الحدود وتغيير الإشارة",
    note: "تكرّر عدم قلب الإشارة عند نقل حدّ بين طرفي المعادلة في اختبارين متتاليين.",
    createdAt: isoDaysAgo(2),
  },
];

export const SEED_STREAK = {
  current: 4,
  longest: 6,
  lastActiveDate: daysAgoKey(1),
};
