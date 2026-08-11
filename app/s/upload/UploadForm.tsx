"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { IconUpload } from "@/components/student/icons";
import { createUploadTicketsAction, ingestUploadedAction } from "./actions";
import { MAX_BYTES, MAX_FILES, type UploadedRef, type UploadState } from "./limits";

const SUBJECTS = [
  { value: "الرياضيات", label: "الرياضيات" },
  { value: "الفيزياء", label: "الفيزياء" },
  { value: "الكيمياء", label: "الكيمياء" },
  { value: "اللغة العربية", label: "اللغة العربية" },
  { value: "اللغة الإنجليزية", label: "اللغة الإنجليزية" },
  { value: "أخرى", label: "أخرى" },
];

const initialState: UploadState = {};

const formatMb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

/**
 * يرفع ملفًا واحدًا إلى الرابط الموقّع عبر XHR.
 *
 * XHR لا fetch: fetch لا يُبلّغ عن تقدّم الرفع في أي متصفح حتى اليوم، وشريطُ
 * تقدّم حقيقي ليس زينة عند ملف بحجم ٢٥ ميجابايت على شبكة جوّال — بدونه لا
 * يملك الطالب ما يميّز به الرفعَ البطيء عن التعليق التام.
 *
 * شكل الجسم (FormData بحقلَي cacheControl و"") هو ما تتوقّعه نقطة الرفع
 * الموقّع في Supabase Storage، ومطابقٌ لما يُرسله supabase-js.
 */
function uploadToSignedUrl(
  signedUrl: string,
  file: File,
  onProgress: (loaded: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl, true);
    // الرمز في الرابط هو ما يُجيز الرفع، لكن بوابة Supabase تطلب apikey على
    // مسارات /storage/v1 قبل أن تصل إليه — وهو نفس ما يُرسله supabase-js.
    xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`تعذّر رفع "${file.name}" (رمز ${xhr.status}).`));
    xhr.onerror = () => reject(new Error(`انقطع الاتصال أثناء رفع "${file.name}".`));
    xhr.onabort = () => reject(new Error("أُلغي الرفع."));
    xhr.send(body);
  });
}

type Phase = "idle" | "uploading" | "processing";

export function UploadForm() {
  const [state, formAction, processing] = useActionState(ingestUploadedAction, initialState);

  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [sentBytes, setSentBytes] = useState(0);
  const [clientError, setClientError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadedRef[]>([]);

  const formRef = useRef<HTMLFormElement>(null);

  /**
   * الخادم يحذف الملفات من المخزن بعد المعالجة، نجحت أو فشلت. فلو بقي
   * uploaded مملوءًا بعد خطأ، لأرسلت محاولةُ الطالب التالية مساراتٍ لم تعد
   * موجودة وفشلت فشلًا لا يفهمه. تفريغُه هنا يُعيد الضغطة التالية إلى رفعٍ
   * كامل من جديد.
   */
  useEffect(() => {
    if (!state.error) return;
    setPhase("idle");
    setUploaded([]);
    setSentBytes(0);
  }, [state]);

  /**
   * الإرسال الثاني (المسارات وحدها) يُطلَق من هنا لا من نهاية دالة الرفع:
   * الحقل المخفي يُقرأ من الـ DOM لحظة الإرسال، فلا بدّ أن يكون React قد
   * أثبت `uploaded` فيه أولًا — والـ effect يجري بعد الإثبات، بخلاف نداءٍ
   * يلي setState مباشرة.
   */
  useEffect(() => {
    if (phase === "processing" && uploaded.length > 0) formRef.current?.requestSubmit();
  }, [phase, uploaded]);

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  const pending = phase !== "idle" || processing;
  const uploadPct = totalBytes > 0 ? Math.min(100, (sentBytes / totalBytes) * 100) : 0;

  function onPick(list: FileList | null) {
    const picked = Array.from(list ?? []);
    setUploaded([]);
    setSentBytes(0);

    if (picked.length > MAX_FILES) {
      setClientError(`الحد الأقصى ${MAX_FILES} ملفات في المرة الواحدة.`);
      setFiles([]);
      return;
    }
    const tooBig = picked.find((f) => f.size > MAX_BYTES);
    if (tooBig) {
      setClientError(
        `الملف "${tooBig.name}" حجمه ${formatMb(tooBig.size)} ميجابايت — الحد الأقصى ٢٥ ميجابايت.`,
      );
      setFiles([]);
      return;
    }

    setClientError(null);
    setFiles(picked);
  }

  /**
   * الرفع يسبق الإرسال: نرفع الملفات إلى المخزن أولًا، ثم نُرسل النموذج
   * حاملًا مساراتها فقط. لذلك يُعترض submit هنا بدل تمريره إلى formAction.
   */
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (uploaded.length > 0) return; // الملفات مرفوعة سلفًا — دع النموذج يمضي

    e.preventDefault();
    if (files.length === 0) {
      setClientError("اختر ملفًا واحدًا على الأقل.");
      return;
    }

    setClientError(null);
    setPhase("uploading");
    setSentBytes(0);

    try {
      const tickets = await createUploadTicketsAction(
        files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
      );
      if (!tickets.ok) throw new Error(tickets.error);

      // بالتسلسل لا بالتوازي: رفعُ خمسة ملفات معًا على شبكة جوّال يتقاسم
      // النطاق نفسه فلا يُنهي أيًّا منها أسرع، ويجعل التقدّم يقفز عشوائيًا.
      const doneBytes = { value: 0 };
      const refs: UploadedRef[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await uploadToSignedUrl(tickets.tickets[i].signedUrl, file, (loaded) =>
          setSentBytes(doneBytes.value + loaded),
        );
        doneBytes.value += file.size;
        setSentBytes(doneBytes.value);
        refs.push({ path: tickets.tickets[i].path, name: file.name, type: file.type });
      }

      setUploaded(refs);
      setPhase("processing");
    } catch (err) {
      setPhase("idle");
      setClientError(err instanceof Error ? err.message : "تعذّر رفع الملفات.");
    }
  }

  const error = clientError ?? state.error;

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="space-y-6">
      <input type="hidden" name="uploaded" value={JSON.stringify(uploaded)} />

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
            <span className="text-[12px] text-muted">
              PDF · TXT · MD · PPTX — حتى {MAX_FILES} ملفات، ٢٥ ميجابايت للملف
            </span>
            <input
              type="file"
              multiple
              disabled={pending}
              accept=".pdf,.txt,.md,.pptx,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              className="sr-only"
              onChange={(e) => onPick(e.target.files)}
            />
          </label>

          {files.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {files.map((f) => (
                <Badge key={f.name} size="sm" className="max-w-full truncate">
                  {f.name} · {formatMb(f.size)}م.ب
                </Badge>
              ))}
            </div>
          )}
        </div>

        {phase === "uploading" && (
          <ProgressBar
            label="جارٍ رفع الملفات"
            value={uploadPct}
            caption={`${formatMb(sentBytes)} من ${formatMb(totalBytes)} ميجابايت`}
          />
        )}

        {(phase === "processing" || processing) && (
          <p className="text-[12.5px] text-muted">
            اكتمل الرفع — جارٍ تقسيم المحتوى إلى أقسام…
          </p>
        )}

        {error && (
          <p className="flex items-start gap-2 text-[12.5px] text-danger">
            <span aria-hidden="true" className="mt-[7px] h-[2px] w-3 shrink-0 rounded-card bg-danger" />
            {error}
          </p>
        )}
      </Card>

      <div className="space-y-2.5">
        <Button type="submit" size="lg" fullWidth loading={pending} disabled={files.length === 0}>
          رفع وتقسيم
        </Button>
        <p className="text-center text-[12.5px] text-muted">
          يقسّم مُدرِك المحتوى تلقائيًا إلى أقسام، ويولّد اختبار كل قسم عند فتحه.
        </p>
      </div>
    </form>
  );
}

export default UploadForm;
