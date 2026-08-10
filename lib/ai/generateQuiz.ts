/**
 * generateQuiz — توليد اختبار متعدد الخيارات من محتوى قسم دراسي
 *
 * كل سؤال خاطئ مرتبط بـ misconception_id من الكتالوج حتى يتمكن
 * النظام من تشخيص سبب الخطأ لا مجرد رصده.
 */

import { getGenAIClient, TEXT_MODEL, BASE_CONFIG } from "./client";
import { parseAndValidate, withOneRetry } from "./utils";
import { GenerateQuizOutputSchema, type GenerateQuizOutput } from "./schemas";

/** ─── البرومبت الرئيسي ──────────────────────────────────────────── */
function buildPrompt(
  sectionContent: string,
  count: number,
  misconceptionCatalog: Record<string, string>
): string {
  const catalogLines = Object.entries(misconceptionCatalog)
    .map(([id, desc]) => `  - "${id}": ${desc}`)
    .join("\n");

  return `
أنت معلم خبير في وضع أسئلة الاختيار من متعدد للطلاب السعوديين.

المحتوى الدراسي:
"""
${sectionContent}
"""

كتالوج المفاهيم الخاطئة المتاحة (misconception_id → الوصف):
${catalogLines}

المطلوب: اصنع ${count} سؤالاً متعدد الخيارات يستوفي الشروط التالية:

1. كل سؤال له 4 خيارات (options): واحد صحيح فقط.
2. correct_index: فهرس الخيار الصحيح (0، 1، 2، أو 3).
3. misconception_id_per_wrong_option:
   - مفتاح المفتاح = فهرس الخيار (string: "0"، "1"، "2"، "3").
   - يشمل جميع الفهارس الخاطئة الثلاثة فقط (ليس الصحيح).
   - القيمة = misconception_id من الكتالوج أعلاه.
   ⚠️ هذا الحقل إلزامي تمامًا — كل خيار خاطئ يجب أن يحمل misconception_id.
     إذا لم يُطابق الخيار الخاطئ أي مفهوم في الكتالوج، استخدم أقرب مفهوم وأضف ملاحظة في نص الخيار.
4. الأسئلة والخيارات بالعربية الفصحى مع سياق سعودي حين يناسب المادة.
5. تنوّع مستويات الأسئلة: فهم، تطبيق، تحليل.

أعد النتيجة بصيغة JSON صارمة بالشكل التالي فقط:
{
  "questions": [
    {
      "text": "string",
      "options": ["string", "string", "string", "string"],
      "correct_index": number,
      "misconception_id_per_wrong_option": {
        "0": "misconception_id",
        "1": "misconception_id",
        "2": "misconception_id"
      }
    }
  ]
}

ملاحظة: مفاتيح misconception_id_per_wrong_option تمثل الفهارس الخاطئة،
لا تضمّن فهرس الخيار الصحيح (correct_index) في هذه القاموس.
`.trim();
}

// ─────────────────────────────────────────────────────────────────────
// الدالة الرئيسية
// ─────────────────────────────────────────────────────────────────────

/**
 * يُولِّد اختبارًا متعدد الخيارات من محتوى قسم دراسي.
 *
 * @param sectionContent - نص القسم الدراسي (Markdown أو نص عادي)
 * @param count - عدد الأسئلة المطلوبة
 * @param misconceptionCatalog - قاموس {misconception_id → الوصف}
 * @returns قائمة الأسئلة المُولَّدة
 */
export async function generateQuiz(
  sectionContent: string,
  count: number,
  misconceptionCatalog: Record<string, string>
): Promise<GenerateQuizOutput> {
  if (count < 1 || count > 50) {
    throw new Error("عدد الأسئلة يجب أن يكون بين 1 و50.");
  }
  if (Object.keys(misconceptionCatalog).length === 0) {
    throw new Error(
      "كتالوج المفاهيم الخاطئة فارغ. يجب توفير مفهوم واحد على الأقل."
    );
  }

  return withOneRetry(async () => {
    const client = getGenAIClient();

    const response = await client.models.generateContent({
      model: TEXT_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildPrompt(sectionContent, count, misconceptionCatalog),
            },
          ],
        },
      ],
      config: {
        ...BASE_CONFIG,
        temperature: 0.7, // تنوّع في الأسئلة
        maxOutputTokens: 8192,
      },
    });

    const rawText = response.text ?? "";
    return parseAndValidate(rawText, GenerateQuizOutputSchema);
  }, "generateQuiz");
}
