import type { Metadata } from "next";
import { UploadForm } from "./UploadForm";

export const metadata: Metadata = { title: "رفع مصدر" };

/**
 * الـ Server Action يُنفَّذ في دالة هذا المسار، فمدّته هي مدّته. الافتراضي على
 * Vercel أقصر بكثير من تقسيم ملفٍ كبير، و٦٠ ثانية هو سقف خطة Hobby.
 */
export const maxDuration = 60;

export default function UploadPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] font-bold leading-[1.2] tracking-[-0.02em] sm:text-[32px]">
          رفع مصدر دراسي
        </h1>
        <p className="mt-1.5 max-w-[52ch] text-[14px] leading-relaxed text-muted">
          ارفع ملفاتك وسيبنى مُدرِك منها مسارًا مقسّمًا إلى أقسام، مع اختبار قصير بعد كل قسم.
        </p>
      </div>

      <UploadForm />
    </div>
  );
}
