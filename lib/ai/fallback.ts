/**
 * بديل احتياطي محلي لطبقة الذكاء الاصطناعي.
 *
 * يُستخدم فقط حين يفشل الاستدعاء الحقيقي (لا مفتاح GEMINI_API_KEY، لا اتصال
 * شبكة، أو خطأ من النموذج) حتى يبقى مسار الرفع يعمل ويمكن اختباره دون مفتاح.
 * كل ناتج هنا يمرّ من نفس مخططات Zod التي يمرّ منها الناتج الحقيقي.
 */

import type {
  GenerateQuizOutput,
  GenerateRemedialOutput,
  SplitSourceOutput,
} from "./schemas";

/** يُستخدم حين يتعذّر تحديد مفهوم خاطئ حقيقي لخيار في اختبار احتياطي. */
export const FALLBACK_MISCONCEPTION_ID = "m-general-review";

export function fallbackSplitSource(sourceTitle: string): SplitSourceOutput {
  return {
    sections: [
      {
        order_no: 1,
        title: "مقدّمة",
        content_md:
          `## ${sourceTitle}\n\n` +
          `تعذّر الوصول إلى نموذج الذكاء الاصطناعي أثناء رفع هذا الملف، فحصلت على تقسيم مبدئي مؤقّت بدل التقسيم الدقيق. ` +
          `يمكنك متابعة الاختبار الآن، وإعادة رفع الملف لاحقًا للحصول على أقسام مطابقة لمحتواه الفعلي.`,
        key_concepts: [sourceTitle],
      },
      {
        order_no: 2,
        title: "المحتوى الرئيسي",
        content_md:
          `## المحتوى الرئيسي\n\nهذا قسم عام يجمع محتوى الملف إلى حين توفّر تقسيم دقيق. راجع الملف الأصلي جنبًا إلى جنب مع أسئلة الاختبار أدناه.`,
        key_concepts: [`${sourceTitle} — عام`],
      },
    ],
  };
}

export function fallbackGenerateQuiz(
  sectionTitle: string,
  keyConcepts: string[],
): GenerateQuizOutput {
  const concept = keyConcepts[0] ?? sectionTitle;
  const wrongMap = { "1": FALLBACK_MISCONCEPTION_ID, "2": FALLBACK_MISCONCEPTION_ID, "3": FALLBACK_MISCONCEPTION_ID };
  return {
    questions: [
      {
        text: `أيّ ممّا يلي أقرب لمفهوم رئيسي في قسم "${sectionTitle}"؟`,
        options: [concept, "مفهوم غير مرتبط بالقسم", "لا شيء ممّا سبق", "لا يمكن تحديد ذلك"],
        correct_index: 0,
        misconception_id_per_wrong_option: wrongMap,
      },
      {
        text: `هل راجعت محتوى قسم "${sectionTitle}" قبل الإجابة؟`,
        options: ["نعم، راجعته بعناية", "لا، أجبت مباشرة", "لم أفتح المحتوى أصلًا", "لست متأكدًا"],
        correct_index: 0,
        misconception_id_per_wrong_option: wrongMap,
      },
      {
        text: `ما الخطوة التالية الأنسب بعد إتقان "${sectionTitle}"؟`,
        options: ["الانتقال للقسم التالي", "إعادة القسم من الصفر دون سبب", "تجاهل الاختبار", "حذف الملف"],
        correct_index: 0,
        misconception_id_per_wrong_option: wrongMap,
      },
    ],
  };
}

export function fallbackGenerateRemedial(
  misconceptionId: string,
  misconceptionDescription: string,
): GenerateRemedialOutput {
  return {
    misconception_id: misconceptionId,
    misconception_description: misconceptionDescription,
    questions: [
      {
        text: "راجع تعريف المفهوم أعلاه، ثم اكتب بكلماتك ما الذي كنت تخلط فيه.",
        model_answer:
          "لا توجد إجابة واحدة صحيحة هنا — الهدف أن تتعرّف بنفسك على موضع الخطأ قبل المتابعة.",
        hint: "ارجع إلى القسم الأصلي وابحث عن الفقرة المرتبطة بهذا المفهوم مباشرة.",
      },
      {
        text: "طبّق المفهوم الصحيح على مثال جديد من عندك.",
        model_answer: "أي مثال يستخدم القاعدة الصحيحة بدل الخطأ الشائع المذكور أعلاه يُعدّ إجابة سليمة.",
        hint: "اختر مثالًا بسيطًا بأرقام صغيرة أولًا.",
      },
      {
        text: "قارن بين إجابة صحيحة وأخرى تقع في نفس الخطأ الشائع، ووضّح الفرق بينهما.",
        model_answer: "الفرق الجوهري هو تطبيق القاعدة الصحيحة المذكورة في وصف المفهوم أعلاه بدل الخطأ الشائع.",
        hint: "اكتب الحل خطوة بخطوة، وحدّد الخطوة التي ينقلب فيها الحل الخاطئ عن الصحيح.",
      },
    ],
  };
}
