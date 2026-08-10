import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getFileRaw, getSectionRaw, sectionWithStatus, sectionsWithStatus } from "@/lib/data/store";
import { LessonRunner } from "./LessonRunner";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const section = getSectionRaw(id);
  return { title: section?.title ?? "الدرس" };
}

export default async function LessonPage({ params }: { params: Params }) {
  const { id } = await params;

  const section = getSectionRaw(id);
  if (!section) notFound();
  if (!section.quiz) notFound();

  const file = getFileRaw(section.fileId);
  if (!file) notFound();

  const status = sectionWithStatus(id);
  if (!status || status.status === "locked") {
    // بوابة الإتقان تمنع الوصول المباشر أيضًا، لا الإخفاء من الواجهة فقط
    notFound();
  }

  const siblings = sectionsWithStatus(file.id);
  const currentPos = siblings.findIndex((s) => s.id === id);
  const next = siblings[currentPos + 1] ?? null;

  return (
    <LessonRunner
      fileId={file.id}
      fileTitle={file.title}
      sectionId={section.id}
      sectionTitle={section.title}
      contentMd={section.content_md}
      quiz={section.quiz}
      nextSection={next ? { id: next.id, title: next.title } : null}
    />
  );
}
