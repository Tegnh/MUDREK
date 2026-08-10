/**
 * نقطة الدخول الموحّدة لطبقة الذكاء الاصطناعي في مُدرِك.
 *
 * استخدم هذا الملف عند الاستيراد من خارج lib/ai/:
 *   import { diagnoseSheet, generateQuiz } from "@/lib/ai";
 */

export { diagnoseSheet } from "./diagnoseSheet";
export { splitSource } from "./splitSource";
export { generateQuiz } from "./generateQuiz";
export { generateRemedial } from "./generateRemedial";

// تصدير الأنواع من المخططات
export type {
  DiagnoseSheetOutput,
  AnswerItem,
  SplitSourceOutput,
  Section,
  GenerateQuizOutput,
  QuizQuestion,
  GenerateRemedialOutput,
  RemedialQuestion,
} from "./schemas";
