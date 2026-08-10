/**
 * أداة مساعدة: استخراج JSON من نص استجابة النموذج والتحقق منه بمخطط Zod.
 * تُعيد البيانات المُحقَّقة أو تُلقي خطأً واضحًا.
 */

import { ZodSchema } from "zod";

/**
 * يستخرج أوّل كتلة JSON من نص الاستجابة ثم يتحقق منها بالمخطط المُعطى.
 *
 * @param raw - النص الخام من الاستجابة
 * @param schema - مخطط Zod للتحقق
 * @returns البيانات المُحقَّقة بالنوع الصحيح
 * @throws إذا لم يُعثر على JSON أو فشل التحقق
 */
export function parseAndValidate<T>(raw: string, schema: ZodSchema<T>): T {
  // إزالة غلاف ```json ... ``` إن وُجد
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  // محاولة استخراج أوّل كائن أو مصفوفة JSON
  const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (!jsonMatch) {
    throw new Error(
      `لم يُعثر على JSON صالح في استجابة النموذج.\n` +
      `الاستجابة الخام (أوّل 500 حرف): ${raw.slice(0, 500)}`
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error(
      `فشل تحليل JSON: ${(e as Error).message}\n` +
      `النص المستخرج: ${jsonMatch[0].slice(0, 500)}`
    );
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `فشل التحقق من المخطط (Zod):\n${JSON.stringify(
        result.error.flatten(),
        null,
        2
      )}`
    );
  }

  return result.data;
}

/**
 * ينفّذ دالة تُعيد وعدًا وتُعيد المحاولة مرة واحدة عند الفشل.
 *
 * @param fn - الدالة المراد تنفيذها
 * @param label - وصف قصير للتسجيل في حالة الفشل
 */
export async function withOneRetry<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  try {
    return await fn();
  } catch (firstError) {
    console.warn(
      `[مُدرِك AI] المحاولة الأولى فشلت في "${label}": ${(firstError as Error).message
      }\nجارٍ إعادة المحاولة…`
    );
    try {
      return await fn();
    } catch (secondError) {
      throw new Error(
        `[مُدرِك AI] فشلت المهمة "${label}" بعد محاولتين:\n${(secondError as Error).message
        }`
      );
    }
  }
}
