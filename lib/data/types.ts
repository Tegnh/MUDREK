/**
 * نماذج بيانات نافذة الطالب.
 * لا قاعدة بيانات خلف هذا بعد؛ المتجر في lib/data/store.ts يخزّن هذه الأنواع
 * في الذاكرة (انظر التعليق أعلى الملف هناك لسبب هذا الاختيار).
 */

export type QuizQuestion = {
  text: string;
  options: string[];
  correct_index: number;
  /** المفتاح = فهرس الخيار الخاطئ (نص)، القيمة = معرّف المفهوم الخاطئ. */
  misconception_id_per_wrong_option: Record<string, string>;
};

export type SourceSection = {
  id: string;
  fileId: string;
  order_no: number;
  title: string;
  content_md: string;
  key_concepts: string[];
  /** يُولَّد بكسل عند أول زيارة للدرس؛ null قبل ذلك. */
  quiz: QuizQuestion[] | null;
};

export type SourceFile = {
  id: string;
  title: string;
  subject: string;
  createdAt: string;
  sectionIds: string[];
};

export type Attempt = {
  id: string;
  sectionId: string;
  fileId: string;
  questionIndex: number;
  selectedIndex: number;
  isCorrect: boolean;
  misconceptionId: string | null;
  createdAt: string;
};

export type Misconception = {
  id: string;
  concept: string;
  description: string;
};

/** ما رصده المعلم — يصل مبدئيًا من نافذة المعلم؛ هنا بيانات تمهيدية. */
export type Diagnosis = {
  id: string;
  concept: string;
  note: string;
  createdAt: string;
};

export type StreakState = {
  current: number;
  longest: number;
  /** YYYY-MM-DD بالتوقيت المحلي، أو null إن لم تبدأ محاولة بعد. */
  lastActiveDate: string | null;
};

export type SectionStatus = "mastered" | "in_progress" | "available" | "locked";

export const MASTERY_THRESHOLD = 70;
