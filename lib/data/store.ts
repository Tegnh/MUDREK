import type {
  Attempt,
  Diagnosis,
  QuizQuestion,
  SectionStatus,
  SourceFile,
  SourceSection,
  StreakState,
} from "./types";
import { MASTERY_THRESHOLD } from "./types";
import { SEED_ATTEMPTS, SEED_DIAGNOSES, SEED_FILES, SEED_SECTIONS, SEED_STREAK } from "./seed";
import { findMisconception } from "./misconceptions";
import { riyadhDateKey } from "./date-utils";
import { advanceStreak } from "@/lib/streak";
import type { GenerateRemedialOutput } from "@/lib/ai/schemas";

/**
 * مخزن في الذاكرة، لا قاعدة بيانات حقيقية خلفه.
 *
 * المشروع هاكاثوني بلا طبقة تخزين مُهيَّأة بعد (لا Prisma، لا اتصال قاعدة
 * بيانات، لا مستخدم مُصادَق عليه) — هذا المتجر يحاكي واجهة قاعدة البيانات
 * التي ستحل محله لاحقًا (نفس الأشكال، نفس دلالات القراءة/الكتابة) بأقل
 * مساحة سطح ممكنة، حتى يسهل استبداله دون لمس صفحات app/. يُخزَّن على
 * globalThis حتى ينجو من إعادة تحميل الوحدات في وضع التطوير.
 */

type Db = {
  files: SourceFile[];
  sections: SourceSection[];
  attempts: Attempt[];
  diagnoses: Diagnosis[];
  streak: StreakState;
  remedialCache: Map<string, GenerateRemedialOutput>;
  uid: number;
};

function seedDb(): Db {
  return {
    files: SEED_FILES.map((f) => ({ ...f })),
    sections: SEED_SECTIONS.map((s) => ({ ...s, quiz: s.quiz ? s.quiz.map((q) => ({ ...q })) : null })),
    attempts: SEED_ATTEMPTS.map((a) => ({ ...a })),
    diagnoses: SEED_DIAGNOSES.map((d) => ({ ...d })),
    streak: { ...SEED_STREAK },
    remedialCache: new Map(),
    uid: 1000,
  };
}

const g = globalThis as unknown as { __mudrikDb?: Db };
const db = g.__mudrikDb ?? (g.__mudrikDb = seedDb());

const nextId = (prefix: string) => `${prefix}-${++db.uid}`;

/* ────────────────────────────── قراءات خام ────────────────────────────── */

export function getFileRaw(fileId: string): SourceFile | undefined {
  return db.files.find((f) => f.id === fileId);
}

export function getSectionRaw(sectionId: string): SourceSection | undefined {
  return db.sections.find((s) => s.id === sectionId);
}

function sectionsRawForFile(fileId: string): SourceSection[] {
  return db.sections.filter((s) => s.fileId === fileId).sort((a, b) => a.order_no - b.order_no);
}

/* ────────────────────────────── الدرجات والحالة ────────────────────────────── */

export type ScoreInfo = {
  scorePct: number;
  answeredCount: number;
  totalQuestions: number;
};

function computeScore(sectionId: string): ScoreInfo {
  const section = getSectionRaw(sectionId);
  const total = section?.quiz?.length ?? 0;
  if (total === 0) return { scorePct: 0, answeredCount: 0, totalQuestions: 0 };

  const latestByQuestion = new Map<number, Attempt>();
  for (const a of db.attempts) {
    if (a.sectionId !== sectionId) continue;
    const prev = latestByQuestion.get(a.questionIndex);
    if (!prev || a.createdAt >= prev.createdAt) latestByQuestion.set(a.questionIndex, a);
  }
  const correct = [...latestByQuestion.values()].filter((a) => a.isCorrect).length;
  const scorePct = Math.round((correct / total) * 1000) / 10;
  return { scorePct, answeredCount: latestByQuestion.size, totalQuestions: total };
}

export type SectionWithStatus = SourceSection & ScoreInfo & { status: SectionStatus };

export function sectionsWithStatus(fileId: string): SectionWithStatus[] {
  const secs = sectionsRawForFile(fileId);
  let previousMastered = true; // القسم الأول متاح دائمًا
  return secs.map((s) => {
    const score = computeScore(s.id);
    let status: SectionStatus;
    if (!previousMastered) status = "locked";
    else if (score.answeredCount === 0) status = "available";
    else if (score.scorePct >= MASTERY_THRESHOLD) status = "mastered";
    else status = "in_progress";
    previousMastered = status === "mastered";
    return { ...s, ...score, status };
  });
}

export function sectionWithStatus(sectionId: string): SectionWithStatus | undefined {
  const section = getSectionRaw(sectionId);
  if (!section) return undefined;
  return sectionsWithStatus(section.fileId).find((s) => s.id === sectionId);
}

/**
 * نسبة الإتمام = الأقسام المُتقَنة ÷ مجموع الأقسام. متعمَّد أن تكون العتبة
 * هي الإتقان لا متوسط الدرجات: القسم إمّا عُبر أو لم يُعبر، ومتوسط الدرجات
 * كان يعطي نسبة تتقدّم دون أن يُفتح أي قسم تالٍ فعلًا — رقم لا يطابق ما تراه
 * البوابة. التسمية أسفل الشريط ("س من ص أقسام مُتقَنة") هي نفسها هذا الكسر.
 */
export function fileCompletionPct(fileId: string): number {
  const secs = sectionsWithStatus(fileId);
  if (secs.length === 0) return 0;
  const mastered = secs.filter((s) => s.status === "mastered").length;
  return Math.round((mastered / secs.length) * 1000) / 10;
}

export type FileWithProgress = SourceFile & {
  completionPct: number;
  sectionCount: number;
  masteredCount: number;
  nextSection: SectionWithStatus | null;
};

export function listFilesWithProgress(): FileWithProgress[] {
  return db.files
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((f) => {
      const secs = sectionsWithStatus(f.id);
      const nextSection =
        secs.find((s) => s.status === "in_progress" || s.status === "available") ?? null;
      return {
        ...f,
        completionPct: fileCompletionPct(f.id),
        sectionCount: secs.length,
        masteredCount: secs.filter((s) => s.status === "mastered").length,
        nextSection,
      };
    });
}

export function getFileWithProgress(fileId: string): FileWithProgress | undefined {
  return listFilesWithProgress().find((f) => f.id === fileId);
}

/* ────────────────────────────── عدّاد الالتزام ────────────────────────────── */

export function getStreak(): StreakState {
  return { ...db.streak };
}

/**
 * يُحدَّث فقط عند اكتمال جلسة اختبار قسم كامل (كل أسئلته أُجيب عنها).
 * قرار «متى تمتدّ السلسلة ومتى تنكسر» يعيش في lib/streak.ts وحده — هذا غلاف
 * يطبّقه على النسخة التي في الذاكرة.
 */
function bumpStreak(): boolean {
  const { next, bumped } = advanceStreak(db.streak, riyadhDateKey());
  if (bumped) db.streak = next;
  return bumped;
}

/* ────────────────────────────── تسجيل الإجابات ────────────────────────────── */

export type AnswerResult = {
  isCorrect: boolean;
  correctIndex: number;
  misconceptionId: string | null;
  misconceptionDescription: string | null;
  scorePctAfter: number;
  sessionCompleted: boolean;
  mastered: boolean;
  streak: StreakState;
  streakBumped: boolean;
};

export function recordAnswer(
  sectionId: string,
  questionIndex: number,
  selectedIndex: number,
): AnswerResult {
  const section = getSectionRaw(sectionId);
  const question = section?.quiz?.[questionIndex];
  if (!section || !question) {
    throw new Error("القسم أو السؤال غير موجود.");
  }

  const isCorrect = selectedIndex === question.correct_index;
  const misconceptionId = isCorrect
    ? null
    : (question.misconception_id_per_wrong_option[String(selectedIndex)] ?? null);

  db.attempts.push({
    id: nextId("att"),
    sectionId,
    fileId: section.fileId,
    questionIndex,
    selectedIndex,
    isCorrect,
    misconceptionId,
    createdAt: new Date().toISOString(),
  });

  const score = computeScore(sectionId);
  const sessionCompleted = score.totalQuestions > 0 && score.answeredCount >= score.totalQuestions;
  const streakBumped = sessionCompleted ? bumpStreak() : false;

  return {
    isCorrect,
    correctIndex: question.correct_index,
    misconceptionId,
    misconceptionDescription: findMisconception(misconceptionId)?.description ?? null,
    scorePctAfter: score.scorePct,
    sessionCompleted,
    mastered: score.scorePct >= MASTERY_THRESHOLD,
    streak: getStreak(),
    streakBumped,
  };
}

/* ────────────────────────────── رفع مصدر جديد ────────────────────────────── */

export type NewSectionInput = {
  title: string;
  content_md: string;
  key_concepts: string[];
  quiz: QuizQuestion[];
};

export function addFile(title: string, subject: string, sections: NewSectionInput[]): SourceFile {
  const fileId = nextId("file");
  const secs: SourceSection[] = sections.map((s, i) => ({
    id: nextId("sec"),
    fileId,
    order_no: i + 1,
    title: s.title,
    content_md: s.content_md,
    key_concepts: s.key_concepts,
    quiz: s.quiz,
  }));
  const file: SourceFile = {
    id: fileId,
    title,
    subject,
    createdAt: new Date().toISOString(),
    sectionIds: secs.map((s) => s.id),
  };
  db.files.push(file);
  db.sections.push(...secs);
  return file;
}

/* ────────────────────────────── الجسر: الفجوات ────────────────────────────── */

export type GapMatchingSection = {
  fileId: string;
  fileTitle: string;
  sectionId: string;
  sectionTitle: string;
  questionCount: number;
};

export type GapItem = {
  diagnosisId: string;
  concept: string;
  note: string;
  createdAt: string;
  primaryMisconceptionId: string | null;
  misconceptionDescription: string | null;
  questionCount: number;
  matchingSections: GapMatchingSection[];
  wrongAttemptsCount: number;
};

export function getGaps(): GapItem[] {
  return db.diagnoses.map((d) => {
    const matchingSections: GapMatchingSection[] = [];
    let questionCount = 0;
    let primaryMisconceptionId: string | null = null;

    for (const section of db.sections) {
      if (!section.quiz) continue;
      const conceptMatch = section.key_concepts.includes(d.concept);
      const targeted = section.quiz.filter((qq) =>
        Object.values(qq.misconception_id_per_wrong_option).some(
          (mid) => findMisconception(mid)?.concept === d.concept,
        ),
      );
      if (!conceptMatch && targeted.length === 0) continue;

      const count = conceptMatch ? section.quiz.length : targeted.length;
      questionCount += count;

      if (!primaryMisconceptionId && targeted.length > 0) {
        primaryMisconceptionId =
          Object.values(targeted[0].misconception_id_per_wrong_option).find(
            (mid) => findMisconception(mid)?.concept === d.concept,
          ) ?? null;
      }

      const file = getFileRaw(section.fileId);
      if (!file) continue;
      matchingSections.push({
        fileId: file.id,
        fileTitle: file.title,
        sectionId: section.id,
        sectionTitle: section.title,
        questionCount: count,
      });
    }

    const wrongAttemptsCount = db.attempts.filter(
      (a) => !a.isCorrect && findMisconception(a.misconceptionId)?.concept === d.concept,
    ).length;

    return {
      diagnosisId: d.id,
      concept: d.concept,
      note: d.note,
      createdAt: d.createdAt,
      primaryMisconceptionId,
      misconceptionDescription: primaryMisconceptionId
        ? (findMisconception(primaryMisconceptionId)?.description ?? null)
        : null,
      questionCount,
      matchingSections,
      wrongAttemptsCount,
    };
  });
}

export function getCachedRemedial(misconceptionId: string): GenerateRemedialOutput | undefined {
  return db.remedialCache.get(misconceptionId);
}

export function cacheRemedial(misconceptionId: string, data: GenerateRemedialOutput): void {
  db.remedialCache.set(misconceptionId, data);
}
