"use client";

import { useActionState, useState } from "react";
import { Card } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { IconUpload } from "@/components/student/icons";
import { uploadSourceAction, type UploadState } from "./actions";

const SUBJECTS = [
  { value: "الرياضيات", label: "الرياضيات" },
  { value: "الفيزياء", label: "الفيزياء" },
  { value: "الكيمياء", label: "الكيمياء" },
  { value: "اللغة العربية", label: "اللغة العربية" },
  { value: "اللغة الإنجليزية", label: "اللغة الإنجليزية" },
  { value: "أخرى", label: "أخرى" },
];

const initialState: UploadState = {};

export function UploadForm() {
  const [state, formAction, pending] = useActionState(uploadSourceAction, initialState);
  const [fileNames, setFileNames] = useState<string[]>([]);

  return (
    <form action={formAction} className="space-y-6">
      <Card padding="lg" className="space-y-6">
        <Input
          label="اسم المسار"
          name="title"
          placeholder="مثال: الجبر — الصف الأول"
          required
          disabled={pending}
        />

        <Select
          label="المادة"
          name="subject"
          placeholder="اختر مادة"
          options={SUBJECTS}
          required
          disabled={pending}
        />

        <div className="w-full">
          <span className="mb-2 block text-[13px] font-medium">الملفات</span>
          <label
            className="paper-ruled flex cursor-pointer flex-col items-center gap-2.5 rounded-card border border-dashed border-line-strong bg-paper px-6 py-10 text-center transition-colors hover:border-ink/30"
            aria-disabled={pending}
          >
            <IconUpload className="size-5 text-muted" />
            <span className="text-[13.5px] font-medium">اضغط لاختيار الملفات</span>
            <span className="text-[12px] text-muted">PDF · TXT · MD · PPTX — حتى ٥ ملفات</span>
            <input
              type="file"
              name="files"
              multiple
              required
              disabled={pending}
              accept=".pdf,.txt,.md,.pptx,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              className="sr-only"
              onChange={(e) => setFileNames(Array.from(e.target.files ?? []).map((f) => f.name))}
            />
          </label>

          {fileNames.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {fileNames.map((name) => (
                <Badge key={name} size="sm" className="max-w-full truncate">
                  {name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {state.error && (
          <p className="flex items-start gap-2 text-[12.5px] text-danger">
            <span aria-hidden="true" className="mt-[7px] h-[2px] w-3 shrink-0 rounded-card bg-danger" />
            {state.error}
          </p>
        )}
      </Card>

      <div className="space-y-2.5">
        <Button type="submit" size="lg" fullWidth loading={pending}>
          رفع وتقسيم
        </Button>
        <p className="text-center text-[12.5px] text-muted">
          يقسّم مُدرِك المحتوى تلقائيًا إلى أقسام ويولّد اختبارًا قصيرًا لكل قسم — قد يستغرق ذلك حتى دقيقة.
        </p>
      </div>
    </form>
  );
}

export default UploadForm;
