import Link from "next/link";
import type { Metadata } from "next";
import { MudrikLockupEn } from "@/components/brand/Logo";
import Button from "@/components/ui/Button";

/* ==========================================================================
   صفحة الهبوط
   أول ما يراه معلّم أو طالب أو حكّم. مهمتها الوحيدة: أن يعرف الزائر خلال
   ثانية أيّ باب له. لذلك البطاقتان مختلفتان في المادة نفسها لا في اللون:
   بطاقة المعلم لوح داكن (طاولة التصحيح)، وبطاقة الطالب ورقة دفتر مسطّرة.
   البرتقالي في هذه الصفحة يظهر في ثلاثة مواضع فقط: فجوة الشعار، خليّة
   ناقصة في خريطة المعلم، والجزء الناقص من شريط تقدّم الطالب.
   ========================================================================== */

export const metadata: Metadata = {
  title: "مُدرِك — من ورقة الطالب إلى خطة علاجية، في دقيقتين",
};

/* --- رسوم البطاقتين: مأخوذة حرفيًا ممّا يراه كل دور داخل المنتج -------- */

/** خريطة فجوات مصغّرة — ما يفتحه المعلم في /t/class. */
function TeacherGlyph() {
  // 1 = خطأ متكرّر (فجوة)، 0 = لا دليل. صفوف = طلاب، أعمدة = مفاهيم.
  const grid = [
    [0, 1, 0, 0, 0],
    [0, 1, 0, 1, 0],
    [0, 0, 0, 0, 0],
    [0, 1, 0, 0, 1],
  ];
  return (
    <svg
      viewBox="0 0 132 72"
      className="w-full max-w-[168px]"
      aria-hidden="true"
      fill="none"
    >
      {grid.map((row, r) =>
        row.map((cell, c) => (
          <rect
            key={`${r}-${c}`}
            x={c * 27}
            y={r * 18.5}
            width="21"
            height="12"
            rx="4"
            fill={cell ? "var(--color-accent)" : "var(--color-surface)"}
            opacity={cell ? 1 : 0.16}
          />
        )),
      )}
    </svg>
  );
}

/** ثلاثة أشرطة تقدّم — ما يفتحه الطالب في /s. الشريط الأوسط له فجوة. */
function StudentGlyph() {
  const bars = [
    { done: 100, gap: 0 },
    { done: 58, gap: 26 },
    { done: 34, gap: 0 },
  ];
  return (
    <svg
      viewBox="0 0 132 72"
      className="w-full max-w-[168px]"
      aria-hidden="true"
      fill="none"
    >
      {bars.map((bar, i) => {
        const y = 14 + i * 22;
        const done = (bar.done / 100) * 132;
        const gap = (bar.gap / 100) * 132;
        return (
          <g key={i}>
            <rect x="0" y={y} width="132" height="10" rx="5" fill="var(--color-ink)" opacity="0.08" />
            <rect x={132 - done} y={y} width={done} height="10" rx="5" fill="var(--color-ink)" />
            {gap > 0 && (
              <rect
                x={132 - done - gap}
                y={y}
                width={gap}
                height="10"
                rx="5"
                fill="var(--color-accent)"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* --- أيقونات خطوات «كيف يعمل» — خطوط بحدّة 1.5، بلغة الشعار نفسها ------ */

function IconUpload({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 15.5 V4.5 M7.5 9 L12 4.5 L16.5 9" />
      <path d="M4 15.5 V19 a1 1 0 0 0 1 1 h14 a1 1 0 0 0 1-1 v-3.5" />
    </svg>
  );
}

function IconDiagnose({ className }: { className?: string }) {
  // الأشرطة الأربعة نفسها: ثلاثة مكتملة وواحد ناقص
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M4 6.5 H20" />
      <path d="M13 12 H20" />
      <path d="M4 12 H8.5" />
      <path d="M4 17.5 H20" />
    </svg>
  );
}

function IconRemedy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12 H10.5" />
      <path d="M13.5 12 H20" />
      <path d="M11 8 L11 16 M14 8 L14 16" />
    </svg>
  );
}

const STEPS = [
  {
    Icon: IconUpload,
    title: "رفع",
    body: "المعلم يرفع صور أوراق الإجابة دفعةً واحدة، والطالب يرفع مصادره الدراسية.",
  },
  {
    Icon: IconDiagnose,
    title: "تشخيص",
    body: "يقرأ مُدرِك كل ورقة، ويربط كل خطأ بمفهوم مغلوط بعينه — لا بدرجة.",
  },
  {
    Icon: IconRemedy,
    title: "علاج",
    body: "يُجمَّع الطلاب حسب المفهوم، ويصل كل مجموعة تمرين موجّه لفجوتها تحديدًا.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      {/* ---------- ترويسة رفيعة ---------- */}
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[1080px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <MudrikLockupEn className="w-[112px] sm:w-[126px]" title="Mudrik" />
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-card px-3 text-[13.5px] font-medium text-muted transition-colors hover:text-ink"
          >
            الدخول
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] px-5 sm:px-8">
        {/* ---------- Hero ---------- */}
        <section className="pt-14 pb-12 sm:pt-20 sm:pb-16">
          <p className="label-eyebrow">تشخيص، لا تصحيح</p>

          <h1 className="mt-5 max-w-[19ch] text-[34px] font-bold leading-[1.16] tracking-[-0.025em] sm:text-[46px] lg:text-[54px]">
            مُدرِك — من ورقة الطالب إلى خطة علاجية، في دقيقتين
          </h1>

          <p className="mt-6 max-w-[56ch] text-[15.5px] leading-[1.85] text-muted sm:text-[17px]">
            المعلم يرفع الاختبار، الذكاء الاصطناعي يشخّص كل طالب على حدة، والطالب يتلقى
            تمرينًا موجّهًا لفجوته تحديدًا — لا لدرجته فقط.
          </p>
        </section>

        {/* ---------- بطاقتا الدخول ---------- */}
        <section aria-labelledby="entry" className="pb-16 sm:pb-20">
          <h2 id="entry" className="sr-only">
            اختر بابك
          </h2>

          <div className="grid gap-4 md:grid-cols-2 md:gap-5">
            {/* --- أنا معلم: لوح داكن --- */}
            <article className="flex flex-col overflow-hidden rounded-card border border-dark-line bg-dark p-7 text-surface sm:p-9">
              <p className="label-eyebrow text-surface/55">أنا معلم</p>

              <h3 className="mt-4 text-[24px] font-bold leading-[1.25] tracking-[-0.015em] sm:text-[27px]">
                شخّص فصلك في دقائق
              </h3>

              <p className="mt-3 max-w-[38ch] text-[14.5px] leading-[1.8] text-surface/70">
                شخّص فصلك في دقائق، اعتمد التصحيح، وأرسل العلاج المناسب لكل مجموعة.
              </p>

              <div className="mt-9 mb-9">
                <TeacherGlyph />
                <p className="mt-4 text-[12px] text-surface/45">
                  خريطة فجوات الفصل — كل خليّة مُعلَّمة خطأ متكرّر عند طالب.
                </p>
              </div>

              <Link href="/login?role=teacher" className="mt-auto block">
                {/* عكس نمط الزر الأساسي: على الحبر يصبح الورق هو السطح البارز */}
                <Button
                  fullWidth
                  size="lg"
                  className="border-surface bg-surface text-ink hover:border-paper hover:bg-paper"
                >
                  ابدأ كمعلم
                </Button>
              </Link>
            </article>

            {/* --- أنا طالب: ورقة دفتر --- */}
            <article className="paper-ruled flex flex-col overflow-hidden rounded-card border border-line-strong bg-paper p-7 sm:p-9">
              <p className="label-eyebrow">أنا طالب</p>

              <h3 className="mt-4 text-[24px] font-bold leading-[1.25] tracking-[-0.015em] sm:text-[27px]">
                ذاكر بخطة، لا بالتخمين
              </h3>

              <p className="mt-3 max-w-[38ch] text-[14.5px] leading-[1.8] text-muted">
                ارفع مصادرك الدراسية، تابع تقدمك يومًا بيوم، واحصل على تمارين تستهدف نقاط
                ضعفك تحديدًا.
              </p>

              <div className="mt-9 mb-9">
                <StudentGlyph />
                <p className="mt-4 text-[12px] text-muted">
                  تقدّمك في كل قسم — والجزء البرتقالي هو ما ينقصك بالضبط.
                </p>
              </div>

              <Link href="/login?role=student" className="mt-auto block">
                <Button fullWidth size="lg">
                  ابدأ كطالب
                </Button>
              </Link>
            </article>
          </div>
        </section>

        {/* ---------- كيف يعمل ---------- */}
        <section aria-labelledby="how" className="border-t border-line py-14 sm:py-20">
          <h2 id="how" className="label-eyebrow">
            كيف يعمل
          </h2>

          <ol className="mt-8 grid gap-8 sm:grid-cols-3 sm:gap-6">
            {STEPS.map(({ Icon, title, body }, i) => (
              <li key={title} className="flex gap-4 sm:block">
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-card border border-line-strong text-ink sm:mb-5"
                >
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="flex items-baseline gap-2.5 text-[17px] font-bold tracking-[-0.01em]">
                    {title}
                    <span dir="ltr" className="tabular text-[12px] font-medium text-muted/70">
                      {i + 1}/3
                    </span>
                  </p>
                  <p className="mt-2 max-w-[34ch] text-[13.5px] leading-[1.8] text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>

      {/* ---------- التذييل ---------- */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-5 px-5 py-9 sm:px-8">
          <MudrikLockupEn className="w-[112px]" />
          <p className="text-[12.5px] text-muted">هاكاثون طويق مع Google</p>
        </div>
      </footer>
    </div>
  );
}
