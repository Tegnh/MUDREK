/**
 * مخططات Zod للتحقق من مخرجات طبقة الذكاء الاصطناعي
 * يُستخدم هذا الملف للتحقق من كل استجابة قبل إرجاعها للمُستدعي
 */

import { z } from "zod";

// ─────────────────────────────────────────────
// 1. diagnoseSheet — تشخيص ورقة الإجابة
// ─────────────────────────────────────────────

export const AnswerItemSchema = z.object({
  /** رقم السؤال في الورقة */
  question_no: z.number().int().positive(),
  /** النص المستخرج من خط يد الطالب */
  extracted_text: z.string(),
  /** هل الإجابة صحيحة؟ */
  is_correct: z.boolean(),
  /**
   * معرّف المفهوم الخاطئ من الكتالوج؛
   * null إذا كانت الإجابة صحيحة أو لم يُحدَّد المفهوم بثقة كافية
   */
  misconception_id: z.string().nullable(),
  /**
   * مستوى ثقة النموذج [0..1].
   * أي قيمة < 0.6 تعني عدم اليقين وتُعامَل كغير محددة.
   */
  confidence: z.number().min(0).max(1),
  /** تبرير النموذج باللغة العربية */
  reasoning: z.string(),
});

export const DiagnoseSheetOutputSchema = z.object({
  /** رمز الطالب كما يظهر في الورقة */
  student_code: z.string(),
  answers: z.array(AnswerItemSchema),
});

export type DiagnoseSheetOutput = z.infer<typeof DiagnoseSheetOutputSchema>;
export type AnswerItem = z.infer<typeof AnswerItemSchema>;

// ─────────────────────────────────────────────
// 2. splitSource — تقسيم المصدر الدراسي
// ─────────────────────────────────────────────

export const SectionSchema = z.object({
  /** الترتيب التسلسلي للقسم */
  order_no: z.number().int().min(1),
  /** عنوان القسم بالعربية */
  title: z.string(),
  /** محتوى القسم بصيغة Markdown */
  content_md: z.string(),
  /** المفاهيم الرئيسية الواردة في هذا القسم */
  key_concepts: z.array(z.string()).min(1),
});

export const SplitSourceOutputSchema = z.object({
  sections: z.array(SectionSchema).min(1),
});

export type SplitSourceOutput = z.infer<typeof SplitSourceOutputSchema>;
export type Section = z.infer<typeof SectionSchema>;

// ─────────────────────────────────────────────
// 3. generateQuiz — توليد اختبار
// ─────────────────────────────────────────────

export const QuizQuestionSchema = z.object({
  /** نص السؤال بالعربية */
  text: z.string(),
  /**
   * أربعة خيارات: واحد صحيح وثلاثة خاطئة.
   * الخيارات مرتّبة عشوائيًا.
   */
  options: z.array(z.string()).length(4),
  /** فهرس الخيار الصحيح (0–3) */
  correct_index: z.number().int().min(0).max(3),
  /**
   * تعيين كل خيار خاطئ بمعرّف مفهومه:
   * المفتاح = فهرس الخيار (string)، القيمة = misconception_id
   * يجب أن تشمل جميع الفهارس الخاطئة (3 مفاتيح)
   */
  misconception_id_per_wrong_option: z
    .record(z.string(), z.string())
    .refine(
      (map) => Object.keys(map).length === 3,
      "يجب تعيين misconception_id لكل خيار خاطئ من الخيارات الثلاثة"
    ),
});

export const GenerateQuizOutputSchema = z.object({
  questions: z.array(QuizQuestionSchema).min(1),
});

export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

// ─────────────────────────────────────────────
// 4. generateRemedial — توليد تمرين علاجي
// ─────────────────────────────────────────────

export const RemedialQuestionSchema = z.object({
  /** نص السؤال العلاجي */
  text: z.string(),
  /** الإجابة النموذجية المفصّلة */
  model_answer: z.string(),
  /** تلميح يساعد الطالب دون إعطاء الإجابة مباشرة */
  hint: z.string(),
});

export const GenerateRemedialOutputSchema = z.object({
  /** معرّف المفهوم الخاطئ المستهدف */
  misconception_id: z.string(),
  /** وصف المفهوم بالعربية */
  misconception_description: z.string(),
  /** ثلاثة أسئلة علاجية متدرجة الصعوبة */
  questions: z.array(RemedialQuestionSchema).length(3),
});

export type GenerateRemedialOutput = z.infer<typeof GenerateRemedialOutputSchema>;
export type RemedialQuestion = z.infer<typeof RemedialQuestionSchema>;
