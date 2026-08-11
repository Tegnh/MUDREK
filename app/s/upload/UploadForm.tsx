"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
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
    // نصّ الردّ يُضمّ إلى الرسالة عمدًا: المخزن يشرح سبب الرفض في جسمه
    // (InvalidKey، تجاوز الحجم، توقيع منتهٍ)، ورقمُ الحالة وحده كان يُخفي ذلك
    // فيصير كل فشلٍ «رمز 400» لا أكثر.
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let detail = "";
      try {
        const parsed = JSON.parse(xhr.responseText) as { message?: string; error?: string };
        detail = parsed.message || parsed.error || "";
      } catch {
        detail = xhr.responseText.slice(0, 120);
      }
      console.error("[رفع] فشل PUT إلى المخزن", { file: file.name, status: xhr.status, detail });
      reject(
        new Error(`تعذّر رفع "${file.name}" (رمز ${xhr.status})${detail ? ` — ${detail}` : ""}.`),
      );
    };
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

  /**
   * الخادم يحذف الملفات من المخزن بعد المعالجة، نجحت أو فشلت — فأي محاولة
   * تالية لا بدّ أن تبدأ برفعٍ كامل من جديد لا بمساراتٍ لم تعد موجودة.
   */
  useEffect(() => {
    if (!state.error) return;
    setPhase("idle");
    setSentBytes(0);
  }, [state]);

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  const pending = phase !== "idle" || processing;
  const uploadPct = totalBytes > 0 ? Math.min(100, (sentBytes / totalBytes) * 100) : 0;

  function onPick(list: FileList | null) {
    const picked = Array.from(list ?? []);
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
   * الرفع يسبق الإرسال: نرفع الملفات إلى المخزن أولًا، ثم نُنادي الإجراء
   * حاملًا مساراتها. لذلك يُعترض submit هنا دائمًا بدل تمريره إلى formAction.
   *
   * الحقول تُقرأ في أول سطر، قبل أي تعطيل.
   *
   * كان النموذج يُعاد إرساله من الـ DOM (requestSubmit) بعد انتهاء الرفع،
   * وحينها تكون الحقول قد صارت disabled لأن `pending` صار صحيحًا — والـ
   * FormData يستثني كل عنصر معطّل. فكان title وsubject يصلان فارغَين إلى
   * الخادم بعد رفعٍ ناجح تمامًا، فيردّ «أدخل اسمًا للمسار» ولا يُنشأ أي مسار.
   * بناء الـ FormData هنا يدويًا يقطع اعتماد القيم على حالة الـ DOM لحظةَ
   * الإرسال، ويُسقط معه الحقل المخفي ورحلة requestSubmit كلها.
   */
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    const subject = String(formData.get("subject") ?? "").trim();

    if (files.length === 0) {
      setClientError("اختر ملفًا واحدًا على الأقل.");
      return;
    }
    if (!title) {
      setClientError("أدخل اسمًا للمسار.");
      return;
    }
    if (!subject) {
      setClientError("اختر المادة.");
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

      formData.set("uploaded", JSON.stringify(refs));
      setPhase("processing");
      startTransition(() => formAction(formData));
    } catch (err) {
      setPhase("idle");
      setClientError(err instanceof Error ? err.message : "تعذّر رفع الملفات.");
    }
  }

  const error = clientError ?? state.error;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
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
