/**
 * اختبار طبقة الذكاء الاصطناعي — مُدرِك
 * =========================================
 * يختبر مخططات Zod والمساعدات الداخلية باستخدام مدخلات وهمية
 * دون استدعاء Gemini API حقيقي.
 *
 * التشغيل:
 *   npx ts-node --project tsconfig.json lib/ai/__tests__/ai.test.ts
 *
 * أو في بيئة Jest:
 *   npx jest lib/ai/__tests__/ai.test.ts
 */

import {
  DiagnoseSheetOutputSchema,
  SplitSourceOutputSchema,
  GenerateQuizOutputSchema,
  GenerateRemedialOutputSchema,
} from "../schemas";
import { parseAndValidate, withOneRetry } from "../utils";

// ─────────────────────────────────────────────────────────────────────
// بيانات وهمية
// ─────────────────────────────────────────────────────────────────────

/** مخرج وهمي لـ diagnoseSheet */
const MOCK_DIAGNOSE_OUTPUT = {
  student_code: "S-1442-0034",
  answers: [
    {
      question_no: 1,
      extracted_text: "الجذر التربيعي لـ 144 هو 14",
      is_correct: false,
      misconception_id: "SQRT_CONFUSION",
      confidence: 0.92,
      reasoning:
        "كتب الطالب 14 بدلاً من 12؛ يبدو أنه أربك الجذر التربيعي بعملية القسمة على 10.",
    },
    {
      question_no: 2,
      extracted_text: "المساحة = الطول × العرض = 6 × 4 = 24 م²",
      is_correct: true,
      misconception_id: null,
      confidence: 0.97,
      reasoning: "الإجابة صحيحة وخط الكتابة واضح.",
    },
    {
      question_no: 3,
      extracted_text: "...",
      is_correct: false,
      misconception_id: null,
      confidence: 0.35,
      reasoning:
        "لم يُمكن قراءة الإجابة بوضوح — خط غير مقروء. confidence < 0.6 وفق القاعدة الإلزامية.",
    },
  ],
};

/** مخرج وهمي لـ splitSource */
const MOCK_SPLIT_OUTPUT = {
  sections: [
    {
      order_no: 1,
      title: "مفهوم العدد الصحيح وخصائصه",
      content_md:
        "## مفهوم العدد الصحيح\n\nالأعداد الصحيحة تشمل الأعداد الطبيعية والصفر والأعداد السالبة...",
      key_concepts: ["الأعداد الصحيحة", "القيمة المطلقة", "خط الأعداد"],
    },
    {
      order_no: 2,
      title: "العمليات الحسابية على الأعداد الصحيحة",
      content_md:
        "## الجمع والطرح\n\nعند جمع عددين موجبين نجمع قيمتيهما...",
      key_concepts: ["جمع الأعداد الصحيحة", "طرح الأعداد الصحيحة", "الإشارات"],
    },
  ],
};

/** مخرج وهمي لـ generateQuiz */
const MOCK_QUIZ_OUTPUT = {
  questions: [
    {
      text: "ما ناتج 3 × (−4)؟",
      options: ["12", "−12", "7", "−7"],
      correct_index: 1,
      misconception_id_per_wrong_option: {
        "0": "SIGN_RULE_MULTIPLICATION",
        "2": "ADD_INSTEAD_MULTIPLY",
        "3": "PARTIAL_SIGN_AWARENESS",
      },
    },
  ],
};

/** مخرج وهمي لـ generateRemedial */
const MOCK_REMEDIAL_OUTPUT = {
  misconception_id: "SQRT_CONFUSION",
  misconception_description:
    "يخلط الطالب بين الجذر التربيعي والقسمة على 2 أو 10؛ " +
    "فيظن أن √144 = 72 (القسمة على 2) أو √144 = 14.4 (القسمة على 10).",
  questions: [
    {
      text: "ما الجذر التربيعي للعدد 25؟",
      model_answer:
        "الجذر التربيعي لـ 25 هو 5، لأن 5 × 5 = 25. " +
        "الجذر التربيعي هو العدد الذي إذا ضربناه في نفسه أعطانا العدد الأصلي.",
      hint: "فكّر في العدد الذي إذا ضربته في نفسه أعطاك 25.",
    },
    {
      text: "مربع ملعب كرة قدم في مدرسة الرياض مساحته 196 م²؛ ما طول ضلعه؟",
      model_answer:
        "طول الضلع = √196 = 14 م، لأن 14 × 14 = 196. " +
        "في الأشكال المربعة نجد الضلع بإيجاد الجذر التربيعي للمساحة.",
      hint: "المساحة = الضلع²؛ إذاً الضلع = الجذر التربيعي للمساحة.",
    },
    {
      text:
        "يقول زميلك إن √81 = 40.5 لأنه قسّم 81 على 2. هل هو مصيب؟ " +
        "وضّح الخطأ واحسب الإجابة الصحيحة.",
      model_answer:
        "لا، زميلك مخطئ. الجذر التربيعي ليس قسمة على 2. " +
        "√81 = 9 لأن 9 × 9 = 81. الخلط بين العمليتين شائع لكنه خطأ مفاهيمي.",
      hint: "اسأل نفسك: أيّ عدد إذا ضربته في نفسه يعطيني 81؟",
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────
// دوال الاختبار
// ─────────────────────────────────────────────────────────────────────

type TestResult = { name: string; passed: boolean; error?: string };

function runTest(name: string, fn: () => void): TestResult {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    return { name, passed: true };
  } catch (e) {
    const msg = (e as Error).message;
    console.error(`  ❌ ${name}\n     ${msg}`);
    return { name, passed: false, error: msg };
  }
}

// ─── 1. DiagnoseSheetOutputSchema ─────────────────────────────────────

function testDiagnoseSchema() {
  console.log("\n📋 اختبار: DiagnoseSheetOutputSchema");

  runTest("بيانات صحيحة تجتاز التحقق", () => {
    const result = DiagnoseSheetOutputSchema.safeParse(MOCK_DIAGNOSE_OUTPUT);
    if (!result.success)
      throw new Error(JSON.stringify(result.error.flatten()));
  });

  runTest("confidence خارج النطاق [0,1] يُفشل التحقق", () => {
    const bad = {
      ...MOCK_DIAGNOSE_OUTPUT,
      answers: [{ ...MOCK_DIAGNOSE_OUTPUT.answers[0], confidence: 1.5 }],
    };
    const result = DiagnoseSheetOutputSchema.safeParse(bad);
    if (result.success) throw new Error("كان يجب أن يفشل التحقق");
  });

  runTest("question_no سالب يُفشل التحقق", () => {
    const bad = {
      ...MOCK_DIAGNOSE_OUTPUT,
      answers: [{ ...MOCK_DIAGNOSE_OUTPUT.answers[0], question_no: -1 }],
    };
    const result = DiagnoseSheetOutputSchema.safeParse(bad);
    if (result.success) throw new Error("كان يجب أن يفشل التحقق");
  });

  runTest("answers فارغة تجتاز التحقق (لا يوجد حد أدنى)", () => {
    const empty = { student_code: "S-000", answers: [] };
    const result = DiagnoseSheetOutputSchema.safeParse(empty);
    if (!result.success)
      throw new Error(JSON.stringify(result.error.flatten()));
  });
}

// ─── 2. SplitSourceOutputSchema ───────────────────────────────────────

function testSplitSchema() {
  console.log("\n📚 اختبار: SplitSourceOutputSchema");

  runTest("بيانات صحيحة تجتاز التحقق", () => {
    const result = SplitSourceOutputSchema.safeParse(MOCK_SPLIT_OUTPUT);
    if (!result.success)
      throw new Error(JSON.stringify(result.error.flatten()));
  });

  runTest("key_concepts فارغة تُفشل التحقق", () => {
    const bad = {
      sections: [{ ...MOCK_SPLIT_OUTPUT.sections[0], key_concepts: [] }],
    };
    const result = SplitSourceOutputSchema.safeParse(bad);
    if (result.success) throw new Error("كان يجب أن يفشل التحقق");
  });

  runTest("sections فارغة تُفشل التحقق", () => {
    const result = SplitSourceOutputSchema.safeParse({ sections: [] });
    if (result.success) throw new Error("كان يجب أن يفشل التحقق");
  });

  runTest("order_no = 0 يُفشل التحقق", () => {
    const bad = {
      sections: [{ ...MOCK_SPLIT_OUTPUT.sections[0], order_no: 0 }],
    };
    const result = SplitSourceOutputSchema.safeParse(bad);
    if (result.success) throw new Error("كان يجب أن يفشل التحقق");
  });
}

// ─── 3. GenerateQuizOutputSchema ──────────────────────────────────────

function testQuizSchema() {
  console.log("\n📝 اختبار: GenerateQuizOutputSchema");

  runTest("بيانات صحيحة تجتاز التحقق", () => {
    const result = GenerateQuizOutputSchema.safeParse(MOCK_QUIZ_OUTPUT);
    if (!result.success)
      throw new Error(JSON.stringify(result.error.flatten()));
  });

  runTest("options بـ 3 خيارات فقط تُفشل التحقق", () => {
    const bad = {
      questions: [
        { ...MOCK_QUIZ_OUTPUT.questions[0], options: ["أ", "ب", "ج"] },
      ],
    };
    const result = GenerateQuizOutputSchema.safeParse(bad);
    if (result.success) throw new Error("كان يجب أن يفشل التحقق");
  });

  runTest("correct_index = 4 يُفشل التحقق", () => {
    const bad = {
      questions: [
        { ...MOCK_QUIZ_OUTPUT.questions[0], correct_index: 4 },
      ],
    };
    const result = GenerateQuizOutputSchema.safeParse(bad);
    if (result.success) throw new Error("كان يجب أن يفشل التحقق");
  });

  runTest("misconception_id_per_wrong_option بـ مفتاحين يُفشل التحقق", () => {
    const bad = {
      questions: [
        {
          ...MOCK_QUIZ_OUTPUT.questions[0],
          misconception_id_per_wrong_option: { "0": "X", "2": "Y" }, // 2 مفاتيح فقط
        },
      ],
    };
    const result = GenerateQuizOutputSchema.safeParse(bad);
    if (result.success) throw new Error("كان يجب أن يفشل التحقق");
  });
}

// ─── 4. GenerateRemedialOutputSchema ─────────────────────────────────

function testRemedialSchema() {
  console.log("\n🩺 اختبار: GenerateRemedialOutputSchema");

  runTest("بيانات صحيحة تجتاز التحقق", () => {
    const result = GenerateRemedialOutputSchema.safeParse(MOCK_REMEDIAL_OUTPUT);
    if (!result.success)
      throw new Error(JSON.stringify(result.error.flatten()));
  });

  runTest("سؤالان فقط (< 3) يُفشل التحقق", () => {
    const bad = {
      ...MOCK_REMEDIAL_OUTPUT,
      questions: MOCK_REMEDIAL_OUTPUT.questions.slice(0, 2),
    };
    const result = GenerateRemedialOutputSchema.safeParse(bad);
    if (result.success) throw new Error("كان يجب أن يفشل التحقق");
  });

  runTest("أربعة أسئلة (> 3) تُفشل التحقق", () => {
    const bad = {
      ...MOCK_REMEDIAL_OUTPUT,
      questions: [
        ...MOCK_REMEDIAL_OUTPUT.questions,
        MOCK_REMEDIAL_OUTPUT.questions[0],
      ],
    };
    const result = GenerateRemedialOutputSchema.safeParse(bad);
    if (result.success) throw new Error("كان يجب أن يفشل التحقق");
  });
}

// ─── 5. parseAndValidate ─────────────────────────────────────────────

function testParseAndValidate() {
  console.log("\n🔧 اختبار: parseAndValidate");

  runTest("JSON مُغلَّف بـ ```json يُحلَّل بنجاح", () => {
    const raw = "```json\n" + JSON.stringify(MOCK_SPLIT_OUTPUT) + "\n```";
    const result = parseAndValidate(raw, SplitSourceOutputSchema);
    if (result.sections.length !== 2)
      throw new Error("عدد الأقسام غير صحيح");
  });

  runTest("نص بدون JSON يُلقي خطأً", () => {
    try {
      parseAndValidate("هذا نص عادي بدون JSON", SplitSourceOutputSchema);
      throw new Error("كان يجب أن يُلقي خطأً");
    } catch (e) {
      if (!(e as Error).message.includes("JSON"))
        throw new Error("رسالة الخطأ غير متوقعة: " + (e as Error).message);
    }
  });

  runTest("JSON صالح لكن لا يطابق المخطط يُلقي خطأً", () => {
    const raw = JSON.stringify({ sections: "not-an-array" });
    try {
      parseAndValidate(raw, SplitSourceOutputSchema);
      throw new Error("كان يجب أن يُلقي خطأً");
    } catch (e) {
      if (!(e as Error).message.includes("Zod"))
        throw new Error("رسالة الخطأ غير متوقعة: " + (e as Error).message);
    }
  });
}

// ─── 6. withOneRetry ─────────────────────────────────────────────────

async function testWithOneRetry() {
  console.log("\n🔁 اختبار: withOneRetry");

  await (async () => {
    try {
      let attempts = 0;
      const result = await withOneRetry(async () => {
        attempts++;
        if (attempts < 2) throw new Error("فشل مؤقت");
        return "نجاح";
      }, "testRetry");
      if (result !== "نجاح" || attempts !== 2) {
        console.error(
          `  ❌ يُعيد المحاولة مرة واحدة ثم ينجح — attempts=${attempts}, result=${result}`
        );
      } else {
        console.log("  ✅ يُعيد المحاولة مرة واحدة ثم ينجح");
      }
    } catch (e) {
      console.error(`  ❌ يُعيد المحاولة مرة واحدة ثم ينجح: ${(e as Error).message}`);
    }
  })();

  await (async () => {
    try {
      await withOneRetry(async () => {
        throw new Error("فشل دائم");
      }, "testPermanentFail");
      console.error("  ❌ فشل دائم يُلقي خطأً — كان يجب أن يُلقي خطأً");
    } catch (e) {
      if ((e as Error).message.includes("محاولتين")) {
        console.log("  ✅ فشل دائم يُلقي خطأً بعد محاولتين");
      } else {
        console.error(
          `  ❌ فشل دائم يُلقي خطأً — رسالة غير متوقعة: ${(e as Error).message}`
        );
      }
    }
  })();
}

// ─────────────────────────────────────────────────────────────────────
// نقطة التشغيل
// ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  مُدرِك — اختبار طبقة الذكاء الاصطناعي (بيانات وهمية)");
  console.log("  لا يتصل بـ Gemini API — آمن للتشغيل في وقت البناء");
  console.log("═══════════════════════════════════════════════════");

  testDiagnoseSchema();
  testSplitSchema();
  testQuizSchema();
  testRemedialSchema();
  testParseAndValidate();
  await testWithOneRetry();

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  اكتملت جميع الاختبارات.");
  console.log("═══════════════════════════════════════════════════\n");
}

main().catch((e) => {
  console.error("خطأ غير متوقع:", e);
  process.exit(1);
});
