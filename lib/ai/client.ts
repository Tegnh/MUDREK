/**
 * عميل @google/genai — يُنشئ مثيلاً واحدًا مشتركًا (singleton)
 * لا يُستدعى في وقت البناء؛ الإنشاء يحدث فقط عند استدعاء أيٍّ من دوال AI.
 */

import { GoogleGenAI, ThinkingLevel, type GenerateContentConfig } from "@google/genai";

let _client: GoogleGenAI | null = null;

/**
 * يُعيد المثيل الموحّد لعميل Gemini.
 * يتطلب متغير البيئة GEMINI_API_KEY.
 */
export function getGenAIClient(): GoogleGenAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "متغير البيئة GEMINI_API_KEY غير موجود. " +
          "أضفه في ملف .env قبل تشغيل أي وظيفة من وظائف الذكاء الاصطناعي."
      );
    }
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}

/**
 * أسماء النماذج.
 *
 * معرّفات جيل 2.5 لم تعد تُخدَم للمفاتيح الجديدة — تُرجِع الواجهة:
 *   "This model models/gemini-2.5-flash is no longer available to new users"
 * لذلك المعرّف هنا من جيل 3.5. ولا تُستخدم لواحق مثل "-latest": هي أسماء
 * مستعارة تنزلق إلى نموذج آخر دون إشعار (gemini-flash-latest تُحلّ حاليًا
 * إلى 3.6)، وثبات المخرجات المنظَّمة أهم من أحدث إصدار.
 */

/** تحليل الصور (متعدد الوسائط) — قراءة ورقة الإجابة بخط اليد */
export const VISION_MODEL = "gemini-3.5-flash";
/** المهام النصية — التقسيم والتوليد */
export const TEXT_MODEL = "gemini-3.5-flash";

/**
 * إعدادات مشتركة لكل نداء.
 *
 * thinkingLevel = "low" مقصود: نماذج جيل 3 تُفكّر افتراضيًا بمستوى مرتفع،
 * فتستهلك مئات الرموز قبل أوّل حرف من الإجابة — وهو تأخير محسوس في طلب
 * يجري داخل Server Action ينتظره المستخدم. مهامنا كلها استخراج وتنسيق
 * بمخطط معروف مسبقًا، لا استنتاج مفتوح، فالمستوى المنخفض يكفيها.
 *
 * ملاحظة: maxOutputTokens يشمل رموز التفكير في هذا الجيل، فخفضُ التفكير
 * يترك مساحة أكبر للمخرجات الفعلية أيضًا.
 */
export const BASE_CONFIG = {
  thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
} satisfies GenerateContentConfig;
