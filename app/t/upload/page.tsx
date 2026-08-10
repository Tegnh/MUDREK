import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getTeacherClasses, getClassExams, getClassRoster } from "@/lib/data/teacher-queries";
import EmptyState from "@/components/ui/EmptyState";
import UploadPanel from "./UploadPanel";

export const metadata: Metadata = { title: "رفع ورقة اختبار" };

export default async function UploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const classes = await getTeacherClasses(supabase, user.id);

  const classesWithData = await Promise.all(
    classes.map(async (c) => {
      const [exams, roster] = await Promise.all([
        getClassExams(supabase, c.id),
        getClassRoster(supabase, c.id),
      ]);
      return {
        id: c.id,
        name: c.name,
        exams: exams.map((e) => ({ id: e.id, title: e.title })),
        roster,
      };
    }),
  );

  return (
    <div>
      <header className="mb-10">
        <h1 className="text-[30px] font-bold leading-[1.25] tracking-[-0.015em]">رفع ورقة اختبار</h1>
        <p className="mt-2 max-w-[64ch] text-[14px] leading-relaxed text-muted">
          اسحب صور أوراق الإجابة وأفلتها دفعة واحدة. يقرأ مُدرِك كل ورقة ويصحّحها بالتوازي، ثم
          يمكنك مراجعة النتائج واعتمادها.
        </p>
      </header>

      {classesWithData.length === 0 ? (
        <EmptyState
          title="لا فصول مسندة إليك بعد"
          description="لا يمكن رفع أوراق اختبار قبل أن يُسند إليك فصل."
        />
      ) : (
        <UploadPanel classes={classesWithData} />
      )}
    </div>
  );
}
