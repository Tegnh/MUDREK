"use client";

import { useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { createExam, processExamImage } from "./actions";

type RosterEntry = { id: string; name: string };
type ExamEntry = { id: string; title: string };
type ClassEntry = { id: string; name: string; exams: ExamEntry[]; roster: RosterEntry[] };

type UploadStatus = "awaiting_student" | "uploading" | "reading" | "done" | "error";

type UploadItem = {
  id: string;
  file: File;
  fileName: string;
  studentId: string;
  status: UploadStatus;
  error?: string;
  rowsCreated?: number;
  correctCount?: number;
};

function IconUpload() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 15.5V4M12 4 7.5 8.5M12 4l4.5 4.5" />
      <path d="M4 15.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5" />
    </svg>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIdx = result.indexOf(",");
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("تعذّرت قراءة الملف."));
    reader.readAsDataURL(file);
  });
}

const statusLabel: Record<UploadStatus, string> = {
  awaiting_student: "اختر طالبًا",
  uploading: "قيد الرفع…",
  reading: "قيد القراءة…",
  done: "تم",
  error: "تعذّر",
};

function StatusPip({ status }: { status: UploadStatus }) {
  if (status === "done") return <Badge variant="solid" size="sm">{statusLabel[status]}</Badge>;
  if (status === "error") return <Badge variant="danger" size="sm">{statusLabel[status]}</Badge>;
  if (status === "awaiting_student") return <Badge size="sm">{statusLabel[status]}</Badge>;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted">
      <span className="flex items-center gap-[2.5px]" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2.5 w-[2px] rounded-card bg-ink animate-tick"
            style={{ animationDelay: `${i * 130}ms` }}
          />
        ))}
      </span>
      {statusLabel[status]}
    </span>
  );
}

export default function UploadPanel({ classes }: { classes: ClassEntry[] }) {
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id ?? "");
  const [selectedExamId, setSelectedExamId] = useState<string>(classes[0]?.exams[0]?.id ?? "");
  const [extraExams, setExtraExams] = useState<Record<string, ExamEntry[]>>({});
  const [showNewExam, setShowNewExam] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState("");
  const [creatingExam, setCreatingExam] = useState(false);
  const [createExamError, setCreateExamError] = useState<string | null>(null);

  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedClass = classes.find((c) => c.id === selectedClassId) ?? classes[0];
  const examsForClass = [...(selectedClass?.exams ?? []), ...(extraExams[selectedClass?.id ?? ""] ?? [])];
  const roster = selectedClass?.roster ?? [];

  function handleClassChange(classId: string) {
    setSelectedClassId(classId);
    const cls = classes.find((c) => c.id === classId);
    const exams = [...(cls?.exams ?? []), ...(extraExams[classId] ?? [])];
    setSelectedExamId(exams[0]?.id ?? "");
    setShowNewExam(exams.length === 0);
  }

  async function handleCreateExam() {
    if (!selectedClass) return;
    setCreatingExam(true);
    setCreateExamError(null);
    const result = await createExam(selectedClass.id, newExamTitle);
    setCreatingExam(false);
    if (!result.ok) {
      setCreateExamError(result.error);
      return;
    }
    setExtraExams((prev) => ({
      ...prev,
      [selectedClass.id]: [...(prev[selectedClass.id] ?? []), { id: result.exam.id, title: result.exam.title }],
    }));
    setSelectedExamId(result.exam.id);
    setNewExamTitle("");
    setShowNewExam(false);
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const newItems: UploadItem[] = Array.from(fileList)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        fileName: file.name,
        studentId: "",
        status: "awaiting_student",
      }));
    setItems((prev) => [...prev, ...newItems]);
  }

  async function processItem(item: UploadItem) {
    if (!selectedExamId || !selectedClass) return;
    try {
      const base64 = await fileToBase64(item.file);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "reading" } : i)));

      const fd = new FormData();
      fd.append("examId", selectedExamId);
      fd.append("classId", selectedClass.id);
      fd.append("studentId", item.studentId);
      fd.append("imageBase64", base64);
      fd.append("fileName", item.fileName);

      const result = await processExamImage(fd);

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? result.ok
              ? { ...i, status: "done", rowsCreated: result.rowsCreated, correctCount: result.correctCount }
              : { ...i, status: "error", error: result.error }
            : i,
        ),
      );
    } catch (e) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "error", error: (e as Error).message } : i)),
      );
    }
  }

  function assignStudent(item: UploadItem, studentId: string) {
    const updated: UploadItem = { ...item, studentId, status: "uploading" };
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    void processItem(updated);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    addFiles(e.dataTransfer.files);
  }

  const dropDisabled = !selectedExamId;
  const doneCount = items.filter((i) => i.status === "done").length;

  return (
    <div className="space-y-6">
      <Card padding="lg">
        <div className="grid gap-5 sm:grid-cols-2">
          <Select
            label="الفصل"
            value={selectedClassId}
            onChange={(e) => handleClassChange(e.target.value)}
            options={classes.map((c) => ({ value: c.id, label: c.name }))}
          />

          {!showNewExam ? (
            <div className="w-full">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-medium">الاختبار</span>
                <button
                  type="button"
                  onClick={() => setShowNewExam(true)}
                  className="text-[12.5px] font-medium text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink"
                >
                  + اختبار جديد
                </button>
              </div>
              <Select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                placeholder={examsForClass.length === 0 ? "لا يوجد اختبار لهذا الفصل" : "اختر اختبارًا"}
                disabled={examsForClass.length === 0}
                options={examsForClass.map((e) => ({ value: e.id, label: e.title }))}
              />
            </div>
          ) : (
            <div className="w-full">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-medium">اختبار جديد</span>
                {examsForClass.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowNewExam(false)}
                    className="text-[12.5px] font-medium text-muted hover:text-ink"
                  >
                    إلغاء
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="مثال: اختبار الفصل الأول"
                  value={newExamTitle}
                  onChange={(e) => setNewExamTitle(e.target.value)}
                  error={createExamError ?? undefined}
                />
                <Button
                  size="md"
                  loading={creatingExam}
                  disabled={!newExamTitle.trim()}
                  onClick={handleCreateExam}
                  className="shrink-0"
                >
                  إنشاء
                </Button>
              </div>
            </div>
          )}
        </div>

        {selectedExamId && (
          <div className="mt-5 flex justify-end">
            <Link
              href={`/t/review/${selectedExamId}`}
              className="text-[13px] font-medium text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink"
            >
              الانتقال إلى المراجعة {doneCount > 0 && `(${doneCount} مكتملة)`}
            </Link>
          </div>
        )}
      </Card>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!dropDisabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={dropDisabled ? undefined : handleDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed px-8 py-16 text-center transition-colors",
          dropDisabled
            ? "cursor-not-allowed border-line bg-surface text-muted/60"
            : dragActive
              ? "border-ink/40 bg-ink/[0.03]"
              : "border-line-strong bg-paper",
        )}
      >
        <span className={cn(dropDisabled ? "text-muted/50" : "text-muted")}>
          <IconUpload />
        </span>
        <p className="text-[15px] font-medium">
          {dropDisabled ? "اختر الفصل والاختبار أولًا" : "اسحب صور أوراق الإجابة وأفلتها هنا"}
        </p>
        {!dropDisabled && (
          <>
            <p className="text-[13px] text-muted">أو</p>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              اختر صورًا من جهازك
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>

      {items.length > 0 && (
        <Card padding="none">
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium" title={item.fileName}>
                  {item.fileName}
                </span>

                {item.status === "awaiting_student" ? (
                  <div className="w-48 shrink-0">
                    <Select
                      placeholder="اختر طالبًا"
                      options={roster.map((s) => ({ value: s.id, label: s.name }))}
                      onChange={(e) => {
                        const student = roster.find((s) => s.id === e.target.value);
                        if (student) assignStudent(item, student.id);
                      }}
                    />
                  </div>
                ) : (
                  <span className="w-48 shrink-0 truncate text-[13px] text-muted">
                    {roster.find((s) => s.id === item.studentId)?.name ?? "—"}
                  </span>
                )}

                <div className="flex shrink-0 items-center gap-3">
                  <StatusPip status={item.status} />
                  {item.status === "done" && (
                    <span dir="ltr" className="tabular text-[12.5px] text-muted">
                      {item.correctCount}/{item.rowsCreated}
                    </span>
                  )}
                </div>

                {item.status === "error" && item.error && (
                  <p className="w-full text-[12.5px] leading-relaxed text-danger">{item.error}</p>
                )}

                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="shrink-0 text-[12.5px] text-muted hover:text-ink"
                  aria-label="إزالة"
                >
                  إزالة
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
