/**
 * diagnoseSheet — تشخيص ورقة إجابة الطالب المكتوبة بخط اليد
 *
 * يُرسل صورة الورقة إلى نموذج Gemini متعدد الوسائط ويعيد تقريرًا
 * مُنظَّمًا يُحدّد إجابات الطالب وكل مفهوم أخطأ فيه.
 */

import { getGenAIClient, VISION_MODEL, BASE_CONFIG } from "./client";
import { parseAndValidate, withOneRetry } from "./utils";
import {
  DiagnoseSheetOutputSchema,
  type DiagnoseSheetOutput,
} from "./schemas";

/** ─── البرومبت الرئيسي ──────────────────────────────────────────── */
function buildPrompt(examId: string): string {
  return `
أنت نظام تصحيح اختبارات ذكي متخصص في التعليم السعودي. مهمتك تحليل ورقة إجابة طالب مكتوبة بخط اليد باللغة العربية.

معرّف الاختبار: ${examId}

تعليمات التحليل:
1. اقرأ رمز الطالب (student_code) من رأس الورقة أو أيّ حقل مخصص له.
2. حلّل كل سؤال وإجابته بعناية.
3. لكل إجابة:
   - استخرج النص الحرفي المكتوب (extracted_text).
   - حدّد صحتها (is_correct).
   - إذا كانت خاطئة، حدّد معرّف المفهوم الخاطئ من الكتالوج المعطى (misconception_id).
   - قيّم مستوى ثقتك (confidence) بين 0 و1.
   - اشرح تفسيرك باللغة العربية الفصحى (reasoning).

⚠️ قاعدة إلزامية — الامتناع أهم من الدقة:
"إن لم تستطع قراءة الإجابة بوضوح، أو لم يطابق الخطأ أي مفهوم في القائمة المعطاة،
ضع confidence أقل من 0.6 ولا تخمّن مطلقًا."

أمثلة على سياق سعودي:
- مادة الرياضيات: العمليات الحسابية، الكسور، المعادلات التربيعية.
- مادة العلوم: دورة الماء، الكيمياء العضوية.
- مادة اللغة العربية: الإعراب، الأساليب البلاغية.

أعد النتيجة بصيغة JSON صارمة بالشكل التالي فقط (بدون أي نص إضافي):
{
  "student_code": "string",
  "answers": [
    {
      "question_no": number,
      "extracted_text": "string",
      "is_correct": boolean,
      "misconception_id": "string | null",
      "confidence": number,
      "reasoning": "string بالعربية"
    }
  ]
}
`.trim();
}

// ─────────────────────────────────────────────────────────────────────
// الدالة الرئيسية
// ─────────────────────────────────────────────────────────────────────

/**
 * يُشخِّص ورقة إجابة طالب من صورة مُرمَّزة بـ Base64.
 *
 * @param imageBase64 - الصورة مُرمَّزة بـ Base64 (بدون رأس data URI)
 * @param examId - معرّف الاختبار للإشارة إليه في البرومبت
 * @returns بيانات الطالب ومصفوفة إجاباته المُحلَّلة
 */
export async function diagnoseSheet(
  imageBase64: string,
  examId: string
): Promise<DiagnoseSheetOutput> {
  return withOneRetry(async () => {
    const client = getGenAIClient();

    const response = await client.models.generateContent({
      model: VISION_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: imageBase64,
              },
            },
            { text: buildPrompt(examId) },
          ],
        },
      ],
      config: {
        ...BASE_CONFIG,
        temperature: 0.1, // دقة عالية مطلوبة — لا إبداعية
        maxOutputTokens: 4096,
      },
    });

    const rawText = response.text ?? "";
    return parseAndValidate(rawText, DiagnoseSheetOutputSchema);
  }, "diagnoseSheet");
}
