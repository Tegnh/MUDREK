/**
 * تجميعات بيانات نافذة المعلم — دوال خالصة (بلا I/O) تُشكِّل صفوف diagnoses
 * الخام (من lib/data/teacher-queries.ts) إلى الشكل الذي تعرضه الشاشات:
 * بطاقة الفصل، خريطة الفجوات، وأعلى المفاهيم المغلوطة.
 */

export type DiagnosisRow = {
  id: string;
  submissionId: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  questionNo: number;
  extractedText: string | null;
  isCorrect: boolean;
  misconceptionId: string | null;
  misconceptionLabel: string | null;
  confidence: number | null;
  teacherApproved: boolean;
};

export type ClassExamSummary = { id: string; title: string; createdAt: string };

export function computeClassSummary(params: {
  studentsCount: number;
  exams: ClassExamSummary[];
  diagnoses: DiagnosisRow[];
}) {
  const lastExam =
    params.exams.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;

  const freq = new Map<string, number>();
  for (const d of params.diagnoses) {
    if (!d.isCorrect && d.misconceptionLabel) {
      freq.set(d.misconceptionLabel, (freq.get(d.misconceptionLabel) ?? 0) + 1);
    }
  }
  let weakestConcept: string | null = null;
  let max = 0;
  for (const [label, n] of freq) {
    if (n > max) {
      max = n;
      weakestConcept = label;
    }
  }

  return {
    studentsCount: params.studentsCount,
    lastExam,
    weakestConcept,
  };
}

export function computeTopMisconceptions(
  diagnoses: DiagnosisRow[],
  studentsCount: number,
  limit = 3,
) {
  const byMisconception = new Map<string, { label: string; students: Set<string> }>();
  for (const d of diagnoses) {
    if (d.isCorrect || !d.misconceptionId || !d.misconceptionLabel) continue;
    if (!byMisconception.has(d.misconceptionId)) {
      byMisconception.set(d.misconceptionId, { label: d.misconceptionLabel, students: new Set() });
    }
    byMisconception.get(d.misconceptionId)!.students.add(d.studentId);
  }
  const denom = studentsCount || 1;
  return Array.from(byMisconception.entries())
    .map(([misconceptionId, v]) => ({
      misconceptionId,
      label: v.label,
      affected: v.students.size,
      pct: Math.round((v.students.size / denom) * 100),
    }))
    .sort((a, b) => b.affected - a.affected)
    .slice(0, limit);
}

export type Heatmap = {
  outcomes: string[];
  roster: { id: string; name: string }[];
  /** matrix[studentId][outcome] = عدد مرات ظهور هذا المفهوم المغلوط عند هذا الطالب. */
  matrix: Record<string, Record<string, number>>;
};

/**
 * خريطة الفجوات مبنية على عدد مرات ظهور كل مفهوم مغلوط، لا على نسبة إتقان —
 * لأن الإجابة الصحيحة لا تحمل وسم ناتج تعلّم في المخطط الحالي (لا يوجد بنك
 * أسئلة مُصنَّف)، بينما كل إجابة خاطئة مصنَّفة تحمل دليلًا فعليًا على فجوة.
 * خليّة فارغة تعني غياب الدليل، لا الإتقان.
 */
export function computeHeatmap(
  diagnoses: DiagnosisRow[],
  roster: { id: string; name: string }[],
): Heatmap {
  const outcomes = Array.from(
    new Set(
      diagnoses
        .filter((d) => !d.isCorrect && d.misconceptionLabel)
        .map((d) => d.misconceptionLabel as string),
    ),
  );

  const matrix: Record<string, Record<string, number>> = {};
  for (const student of roster) matrix[student.id] = {};

  for (const d of diagnoses) {
    if (d.isCorrect || !d.misconceptionLabel) continue;
    const row = matrix[d.studentId];
    if (!row) continue;
    row[d.misconceptionLabel] = (row[d.misconceptionLabel] ?? 0) + 1;
  }

  return { outcomes, roster, matrix };
}

export const CONFIDENCE_REVIEW_THRESHOLD = 0.7;

/** العتبة التي يصير عندها المفهوم "متكرّرًا" لا حادثة منفردة. */
export const RECURRING_THRESHOLD = 2;

export type StudentWeakness = {
  misconceptionId: string;
  label: string;
  /** مرات ظهوره في تشخيصات المعلم. */
  fromDiagnoses: number;
  /** مرات ظهوره في محاولات الطالب الذاتية. */
  fromAttempts: number;
  total: number;
  recurring: boolean;
};

/**
 * نقاط ضعف الطالب مجمَّعة من المسارين معًا على نفس misconception_id — وهذا
 * بالضبط ما يجعل الجدول جسرًا لا قائمتين متجاورتين: مفهوم رصده المعلم مرة
 * وأخطأ فيه الطالب مرة في اختبار ذاتي هو مفهوم متكرّر، حتى لو لم يتكرّر في
 * أيٍّ من المصدرين وحده.
 */
export function computeStudentWeaknesses(
  diagnoses: { isCorrect: boolean; misconceptionId: string | null; misconceptionLabel: string | null }[],
  attempts: { misconceptionId: string | null; misconceptionLabel: string | null }[],
): StudentWeakness[] {
  const byId = new Map<string, StudentWeakness>();

  const bump = (
    id: string | null,
    label: string | null,
    key: "fromDiagnoses" | "fromAttempts",
  ) => {
    if (!id) return;
    const existing =
      byId.get(id) ??
      {
        misconceptionId: id,
        label: label ?? "مفهوم غير معروف",
        fromDiagnoses: 0,
        fromAttempts: 0,
        total: 0,
        recurring: false,
      };
    existing[key] += 1;
    existing.total += 1;
    existing.recurring = existing.total >= RECURRING_THRESHOLD;
    if (label) existing.label = label;
    byId.set(id, existing);
  };

  for (const d of diagnoses) {
    if (d.isCorrect) continue;
    bump(d.misconceptionId, d.misconceptionLabel, "fromDiagnoses");
  }
  // كل صف في attempts يحمل misconception_id فقط حين تكون المحاولة خاطئة.
  for (const a of attempts) bump(a.misconceptionId, a.misconceptionLabel, "fromAttempts");

  return Array.from(byId.values()).sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, "ar"));
}
