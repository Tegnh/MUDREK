/**
 * generateRemedial — توليد تمرين علاجي لمفهوم خاطئ محدد
 *
 * يُنتج ثلاثة أسئلة علاجية متدرجة الصعوبة مصممة لمعالجة مفهوم
 * خاطئ بعينه وفق مستوى الطالب.
 */

import { getGenAIClient, TEXT_MODEL, BASE_CONFIG } from "./client";
import { parseAndValidate, withOneRetry } from "./utils";
import {
  GenerateRemedialOutputSchema,
  type GenerateRemedialOutput,
} from "./schemas";

/** مستويات الطلاب المدعومة */
type StudentLevel = "مبتدئ" | "متوسط" | "متقدم";

/** ─── البرومبت الرئيسي ──────────────────────────────────────────── */
function buildPrompt(
  misconceptionId: string,
  studentLevel: StudentLevel
): string {
  return `
أنت معلم متخصص في التعلّم العلاجي للطلاب السعوديين.
مهمتك تصميم تمرين علاجي يُصحّح مفهومًا خاطئًا محددًا.

المفهوم الخاطئ المستهدف: "${misconceptionId}"
مستوى الطالب: ${studentLevel}

متطلبات التمرين العلاجي:
1. اكتب وصفًا واضحًا للمفهوم الخاطئ (misconception_description) يشرح ما يخطئ فيه الطالب عادةً.
2. صمّم ثلاثة أسئلة علاجية (questions) تستوفي:
   a. السؤال الأول: بسيط ومباشر — يُثبّت الأساس الصحيح.
   b. السؤال الثاني: تطبيقي — يربط المفهوم بمسألة واقعية.
   c. السؤال الثالث: تحليلي — يتحدى الطالب للتمييز بين الصحيح والخاطئ.
3. لكل سؤال:
   - نص السؤال (text) بالعربية الفصحى.
   - إجابة نموذجية مفصّلة (model_answer) تشرح الخطوات.
   - تلميح (hint) يُوجّه دون إعطاء الإجابة مباشرة.
4. استخدم أمثلة من البيئة السعودية (مدارس، مناهج وزارة التعليم، الحياة اليومية).
5. تكيّف مع مستوى الطالب (${studentLevel}):
   - مبتدئ: لغة بسيطة، خطوات صغيرة، أمثلة ملموسة.
   - متوسط: لغة معيارية، تطبيقات متنوعة.
   - متقدم: لغة أكاديمية، تفكير نقدي، ربط بمفاهيم أخرى.

أعد النتيجة بصيغة JSON صارمة بالشكل التالي فقط:
{
  "misconception_id": "${misconceptionId}",
  "misconception_description": "string — وصف المفهوم الخاطئ",
  "questions": [
    {
      "text": "string",
      "model_answer": "string — إجابة مفصلة",
      "hint": "string — تلميح دون إفساد"
    },
    { ... },
    { ... }
  ]
}
`.trim();
}

// ─────────────────────────────────────────────────────────────────────
// الدالة الرئيسية
// ─────────────────────────────────────────────────────────────────────

/**
 * يُولِّد تمرينًا علاجيًا من ثلاثة أسئلة لمفهوم خاطئ محدد.
 *
 * @param misconceptionId - معرّف المفهوم الخاطئ (من الكتالوج)
 * @param studentLevel    - مستوى الطالب: "مبتدئ" | "متوسط" | "متقدم"
 * @returns التمرين العلاجي مع الوصف والأسئلة والإجابات النموذجية
 */
export async function generateRemedial(
  misconceptionId: string,
  studentLevel: StudentLevel = "متوسط"
): Promise<GenerateRemedialOutput> {
  if (!misconceptionId.trim()) {
    throw new Error("misconceptionId لا يمكن أن يكون فارغًا.");
  }

  return withOneRetry(async () => {
    const client = getGenAIClient();

    const response = await client.models.generateContent({
      model: TEXT_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: buildPrompt(misconceptionId, studentLevel) }],
        },
      ],
      config: {
        ...BASE_CONFIG,
        temperature: 0.5,
        maxOutputTokens: 4096,
      },
    });

    const rawText = response.text ?? "";
    return parseAndValidate(rawText, GenerateRemedialOutputSchema);
  }, "generateRemedial");
}
