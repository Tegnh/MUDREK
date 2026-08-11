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
 * أخطاء لا تُصلحها إعادة المحاولة: مفتاح ناقص، نموذج غير موجود، صلاحية
 * مرفوضة، ملف أكبر من الحدّ. إعادةُ نداءٍ كهذا تضاعف زمن الانتظار حرفيًا
 * دون أيّ احتمال نجاح — وهي في مسار يقف فيه المستخدم أمام الشاشة.
 */
function isPermanent(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const status = (error as { status?: number })?.status;
  if (status === 400 || status === 401 || status === 403 || status === 404) return true;
  return /GEMINI_API_KEY|API key|not found|no longer available|PERMISSION_DENIED|INVALID_ARGUMENT/i
    .test(message);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * ينفّذ دالة تُعيد وعدًا وتُعيد المحاولة مرة واحدة عند الفشل العابر.
 *
 * تُوقف المحاولة الثانية عند الأخطاء الدائمة (انظر isPermanent)، وتُمهل قبلها
 * لحظة قصيرة: أغلب الإخفاقات العابرة هنا هي 429/503 من الحصّة، وإعادةُ النداء
 * فورًا تصطدم بالسبب نفسه.
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
    if (isPermanent(firstError)) throw firstError;

    console.warn(
      `[مُدرِك AI] المحاولة الأولى فشلت في "${label}": ${(firstError as Error).message
      }\nجارٍ إعادة المحاولة…`
    );
    await sleep(600);
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

/**
 * يُنفّذ مهامّ على دفعات متوازية بحدّ أقصى مُعلَن، مع الحفاظ على ترتيب النتائج.
 *
 * السبب: مسار الرفع كان يُنادي Gemini بالتسلسل — نداء لكل ملف ثم نداء لكل
 * قسم ناتج. عشرون قسمًا × ~٢٠ ثانية = خمس دقائق ينتظرها الطالب. النداءات
 * مستقلّة تمامًا عن بعضها، فلا شيء يُبرّر تسلسلها. والحدّ الأقصى موجود لأن
 * إطلاقها كلها دفعة واحدة يصطدم بحصّة الطلبات في الدقيقة فيرتدّ 429.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(Math.max(limit, 1), items.length) }, worker)
  );
  return results;
}
