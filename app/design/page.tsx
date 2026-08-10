import type { ReactNode } from "react";
import type { Metadata } from "next";
import { cn } from "@/lib/cn";
import Logo, {
  MudrikLockupBilingual,
  MudrikLockupEn,
  MudrikMark,
  MudrikMarkTile,
} from "@/components/brand/Logo";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ProgressBar from "@/components/ui/ProgressBar";
import Skeleton, { SkeletonBars, SkeletonText } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

/* ==========================================================================
   صفحة عرض النظام — ورقة مواصفات، لا معرض
   ليست صفحة منتج: صفحة الهبوط التسويقية هي "/"، وهذه مرجع داخلي للمكوّنات.
   ========================================================================== */

export const metadata: Metadata = { title: "نظام التصميم" };

const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const ordinal = (n: number) =>
  String(n)
    .padStart(2, "0")
    .split("")
    .map((d) => AR_DIGITS[Number(d)])
    .join("");

function Section({
  index,
  title,
  note,
  children,
}: {
  index: number;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={`s${index}`}
      className="scroll-mt-8 border-t border-line py-14 lg:grid lg:grid-cols-[188px_1fr] lg:gap-14 lg:py-20"
    >
      <header className="mb-9 lg:mb-0">
        <div className="flex items-baseline gap-3 lg:block">
          <span className="tabular text-[13px] font-bold text-muted/60">
            {ordinal(index)}
          </span>
          <h2 className="label-eyebrow lg:mt-2.5">{title}</h2>
        </div>
        {note && (
          <p className="mt-3 hidden max-w-[26ch] text-[13px] leading-relaxed text-muted lg:block">
            {note}
          </p>
        )}
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** سطر مواصفة: تسمية صغيرة ثم العيّنة. هذا هو إيقاع الصفحة كلها. */
function Spec({
  label,
  children,
  align = "center",
}: {
  label: string;
  children: ReactNode;
  align?: "center" | "start";
}) {
  return (
    <div className="border-b border-line/70 py-6 first:pt-0 last:border-0 last:pb-0 sm:grid sm:grid-cols-[104px_1fr] sm:gap-7">
      <span
        className={cn(
          "mb-3 block text-[12px] leading-6 text-muted sm:mb-0",
          align === "center" && "sm:self-center",
        )}
      >
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/**
 * عزل ثنائي الاتجاه. الرموز التقنية (‎#101E2B‎، ‎--ink‎، ‎44 / 700‎) محارفها
 * الأولى محايدة، فتنعكس داخل فقرة عربية. الاتجاه هنا يُثبَّت صراحةً.
 */
function Ltr({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span dir="ltr" className={cn("inline-block", className)}>
      {children}
    </span>
  );
}

function Frame({
  children,
  dark = false,
  className,
}: {
  children: ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-card border p-8",
        dark ? "border-dark-line bg-dark" : "border-line bg-paper",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* --- أيقونات: مرسومة يدويًا بحدّة 1.5 لتطابق وزن العلامة ----------------- */

function IconPlus() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M8 3.25 L8 12.75 M3.25 8 L12.75 8" />
    </svg>
  );
}

function IconForward() {
  // في RTL يشير الاتجاه «التالي» إلى اليسار
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12.5 8 L3.5 8 M7 3.5 L2.5 8 L7 12.5" />
    </svg>
  );
}

/* --- عيّنات البيانات ------------------------------------------------------ */

const swatches = [
  { name: "--ink", hex: "#101E2B", note: "النص، الأزرار الأساسية، الحبر" },
  { name: "--surface", hex: "#FAF7F2", note: "خلفية الصفحة" },
  { name: "--paper", hex: "#FFFDF9", note: "سطح البطاقة" },
  { name: "--line", hex: "#E8E0D6", note: "كل الحدود" },
  { name: "--muted", hex: "#6B7C8C", note: "النص الثانوي" },
  { name: "--dark", hex: "#0A141D", note: "الأسطح الداكنة" },
  { name: "--accent", hex: "#F0722C", note: "الفجوة فقط", signal: true },
  { name: "--danger", hex: "#A32E1C", note: "الإجراءات المتلفة" },
];

const typeScale = [
  { sample: "قياس الفهم", cls: "text-[44px] font-bold leading-[1.14] tracking-[-0.02em]", spec: "44 / 700" },
  { sample: "أين تتوقّف معرفتك", cls: "text-[30px] font-bold leading-[1.25] tracking-[-0.015em]", spec: "30 / 700" },
  { sample: "خريطة المفاهيم", cls: "text-[20px] font-medium leading-snug", spec: "20 / 500" },
  { sample: "عنوان بطاقة", cls: "text-[17px] font-bold leading-snug tracking-[-0.01em]", spec: "17 / 700" },
  {
    sample:
      "النصّ الأساسي. الأسطر في العربية تحتاج ارتفاعًا أكرم من اللاتينية، فالسطر هنا 1.75 لا 1.5.",
    cls: "text-[15px] leading-[1.75]",
    spec: "15 / 400",
  },
  { sample: "نصّ مساعد ثانوي", cls: "text-[13px] text-muted leading-relaxed", spec: "13 / 400" },
  { sample: "تسمية قسم", cls: "label-eyebrow", spec: "11 / 700 / 0.16em" },
];

export default function DesignSystemPage() {
  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-28 sm:px-10">
      {/* ---------- الترويسة ---------- */}
      <header className="pt-16 pb-16 lg:pt-24 lg:pb-20">
        <Logo variant="ar" className="w-[150px]" title="مُدرِك" />

        <h1 className="mt-11 max-w-[15ch] text-[42px] font-bold leading-[1.12] tracking-[-0.025em] lg:text-[56px]">
          نظام التصميم
        </h1>

        <p className="mt-6 max-w-[54ch] text-[16px] leading-[1.85] text-muted">
          الرموز والمكوّنات التي تُبنى عليها كل شاشة في مُدرِك. البرتقالي في هذه
          الصفحة ليس لون علامة تجارية — إنّه إشارة قياس، ولن تجده إلا حيث توجد
          فجوة معرفية.
        </p>

        <dl className="mt-11 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-line pt-6 text-[12.5px]">
          {[
            ["الإصدار", "١٫٠"],
            ["الخط", "IBM Plex Sans Arabic"],
            ["الأوزان", "400 · 500 · 700"],
            ["الاتجاه", "RTL"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline gap-2">
              <dt className="text-muted">{k}</dt>
              <dd className="font-medium">
                <Ltr>{v}</Ltr>
              </dd>
            </div>
          ))}
        </dl>
      </header>

      {/* ---------- ٠١ الهوية ---------- */}
      <Section
        index={1}
        title="الهوية"
        note="أربعة أشرطة: ثلاثة أسطر مكتملة، وسطر ناقص. النقص هو الفكرة."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Frame className="min-h-[168px]">
            <Logo variant="ar" className="w-full max-w-[290px]" title="مُدرِك" />
          </Frame>
          <Frame dark className="min-h-[168px]">
            <Logo variant="ar" tone="surface" className="w-full max-w-[290px]" title="مُدرِك" />
          </Frame>
          <Frame className="min-h-[168px]">
            <MudrikLockupEn className="w-full max-w-[280px]" />
          </Frame>
          <Frame dark className="min-h-[168px]">
            <MudrikLockupBilingual tone="surface" className="w-full max-w-[200px]" />
          </Frame>
        </div>

        <div className="mt-4 rounded-card border border-line bg-paper p-8">
          <Spec label="اختبار الحجم">
            <div className="flex flex-wrap items-end gap-8">
              {[16, 24, 32, 48, 64].map((size) => (
                <div key={size} className="flex flex-col items-center gap-2.5">
                  <MudrikMark style={{ width: size }} />
                  <span className="tabular text-[11px] text-muted">
                    <Ltr>{size}px</Ltr>
                  </span>
                </div>
              ))}
            </div>
          </Spec>

          <Spec label="الأفاتار">
            <div className="flex flex-wrap items-end gap-6">
              <MudrikMarkTile className="w-16 rounded-card" title="مُدرِك" />
              <div className="size-16 overflow-hidden rounded-full">
                <MudrikMarkTile className="size-full" />
              </div>
              <MudrikMarkTile className="w-11 rounded-card" />
              <MudrikMarkTile className="w-8 rounded-card" />
            </div>
          </Spec>

          <Spec label="أحادي اللون">
            <div className="flex flex-wrap items-end gap-6">
              <MudrikMark tone="mono" className="w-14 text-ink" />
              <MudrikMark tone="mono" className="w-14 text-muted" />
              <div className="rounded-card bg-dark p-2.5">
                <MudrikMark tone="mono" className="w-9 text-surface" />
              </div>
            </div>
          </Spec>
        </div>
      </Section>

      {/* ---------- ٠٢ اللون ---------- */}
      <Section
        index={2}
        title="اللون"
        note="ستة ألوان محايدة، ولون إشارة واحد له قاعدة واحدة صارمة."
      >
        <div className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-4">
          {swatches.map((s) => (
            <div key={s.name}>
              <div
                className="h-[72px] rounded-card border border-ink/10"
                style={{ background: s.hex }}
              />
              <p className="mt-3 flex items-center gap-2 text-[12.5px] font-medium">
                <Ltr>{s.name}</Ltr>
                {s.signal && <Badge size="sm" variant="gap">إشارة</Badge>}
              </p>
              <p className="tabular mt-0.5 text-[12px] text-muted">
                <Ltr>{s.hex}</Ltr>
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">{s.note}</p>
            </div>
          ))}
        </div>

        <Card flagged className="mt-10" padding="lg">
          <p className="text-[13px] font-bold">قاعدة البرتقالي</p>
          <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-muted">
            يُستخدم <Ltr className="font-medium text-ink">#F0722C</Ltr> حصرًا لتعليم
            فجوة أو نقطة ضعف: شارة فجوة، الجزء الناقص من شريط تقدّم، أو الحافة العليا
            لبطاقة تشير إلى نقص. لا يُستخدم زرًّا أساسيًا، ولا رابطًا، ولا خلفية قسم،
            ولا زينة. الشريط البرتقالي أعلى هذه البطاقة هو نفسه الاستخدام المسموح.
          </p>
        </Card>
      </Section>

      {/* ---------- ٠٣ الطباعة ---------- */}
      <Section
        index={3}
        title="الطباعة"
        note="ثلاثة أوزان فقط. لا وزن سادس ولا خط ثانٍ."
      >
        <div className="rounded-card border border-line bg-paper px-8 py-2">
          {typeScale.map((t) => (
            <div
              key={t.spec}
              className="flex items-baseline justify-between gap-8 border-b border-line/70 py-6 last:border-0"
            >
              <p className={cn("min-w-0", t.cls)}>{t.sample}</p>
              <span className="tabular shrink-0 text-[11px] text-muted/80">
                <Ltr>{t.spec}</Ltr>
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- ٠٤ الأزرار ---------- */}
      <Section
        index={4}
        title="الأزرار"
        note="الإجراء الأساسي حبري. البرتقالي ممنوع هنا تمامًا."
      >
        <div className="rounded-card border border-line bg-paper p-8">
          <Spec label="أساسي">
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">ابدأ التقييم</Button>
              <Button>ابدأ التقييم</Button>
              <Button size="lg">ابدأ التقييم</Button>
              <Button icon={<IconPlus />}>مسار جديد</Button>
              <Button icon={<IconForward />}>التالي</Button>
            </div>
          </Spec>

          <Spec label="شبحي">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="ghost" size="sm">تخطّي</Button>
              <Button variant="ghost">تخطّي</Button>
              <Button variant="ghost" size="lg">تخطّي</Button>
              <Button variant="ghost" icon={<IconPlus />}>إضافة سؤال</Button>
            </div>
          </Spec>

          <Spec label="متلف">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="danger" size="sm">حذف المسار</Button>
              <Button variant="danger">حذف المسار</Button>
              <Button variant="danger" size="lg">حذف المسار</Button>
            </div>
          </Spec>

          <Spec label="معطّل">
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled>ابدأ التقييم</Button>
              <Button variant="ghost" disabled>تخطّي</Button>
              <Button variant="danger" disabled>حذف المسار</Button>
            </div>
          </Spec>

          <Spec label="انتظار">
            <div className="flex flex-wrap items-center gap-3">
              <Button loading>جارٍ التحليل</Button>
              <Button variant="ghost" loading>جارٍ التحليل</Button>
              <Button variant="danger" loading>جارٍ الحذف</Button>
            </div>
          </Spec>

          <Spec label="بعرض كامل" align="start">
            <div className="max-w-[340px]">
              <Button fullWidth size="lg">
                اعرض خريطة الفجوات
              </Button>
            </div>
          </Spec>
        </div>
      </Section>

      {/* ---------- ٠٥ الشارات ---------- */}
      <Section index={5} title="الشارات" note="أربع دلالات، لا أكثر.">
        <div className="rounded-card border border-line bg-paper p-8">
          <Spec label="محايد">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge>مسودّة</Badge>
              <Badge size="sm">مسودّة</Badge>
              <Badge>١٢ سؤالًا</Badge>
            </div>
          </Spec>
          <Spec label="مصمت">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="solid">مُتقَن</Badge>
              <Badge variant="solid" size="sm">مُتقَن</Badge>
              <Badge variant="solid">منشور</Badge>
            </div>
          </Spec>
          <Spec label="فجوة">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="gap">فجوة</Badge>
              <Badge variant="gap" size="sm">فجوة</Badge>
              <Badge variant="gap">يحتاج مراجعة</Badge>
            </div>
          </Spec>
          <Spec label="خطر">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="danger">منتهٍ</Badge>
              <Badge variant="danger" size="sm">منتهٍ</Badge>
            </div>
          </Spec>
        </div>
      </Section>

      {/* ---------- ٠٦ البطاقات ---------- */}
      <Section
        index={6}
        title="البطاقات"
        note="حد رفيع واحد، زاوية 12، والظل استثناء لا قاعدة."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardTitle>أساس القياس</CardTitle>
            <CardDescription>
              بطاقة عادية: حدّ رفيع، بلا ظل. هذا هو الوضع الافتراضي في كل مكان.
            </CardDescription>
          </Card>

          <Card elevated>
            <CardTitle>مرفوعة</CardTitle>
            <CardDescription>
              الظل الوحيد في النظام، للعناصر التي تطفو فعلًا: قائمة منسدلة، نافذة،
              شريط ثابت.
            </CardDescription>
          </Card>

          <Card flagged>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>المتتاليات الهندسية</CardTitle>
                <CardDescription>
                  ثلاث إجابات خاطئة من أصل خمس في هذا المفهوم.
                </CardDescription>
              </div>
              <Badge variant="gap" size="sm">فجوة</Badge>
            </div>
            <ProgressBar className="mt-6" value={40} gap={35} showValue={false} size="sm" />
          </Card>

          <Card padding="none">
            <CardHeader>
              <CardTitle>مُركَّبة</CardTitle>
              <CardDescription>ترويسة، متن، وتذييل بفواصل شعرية.</CardDescription>
            </CardHeader>
            <CardBody>
              <p className="text-[14px] leading-relaxed text-muted">
                تُستخدم حين تحتاج البطاقة إلى إجراء ثابت في أسفلها.
              </p>
            </CardBody>
            <CardFooter>
              <Button size="sm">تابع</Button>
              <Button size="sm" variant="ghost">لاحقًا</Button>
            </CardFooter>
          </Card>
        </div>
      </Section>

      {/* ---------- ٠٧ الحقول ---------- */}
      <Section
        index={7}
        title="الحقول"
        note="التركيز حلقة حبرية صلبة، بلا توهّج ملوّن."
      >
        <div className="rounded-card border border-line bg-paper p-8">
          <div className="grid gap-7 md:grid-cols-2">
            <Input label="اسم المسار" placeholder="مثال: الجبر — الصف الأول" />
            <Input
              label="عدد الأسئلة"
              type="number"
              defaultValue={12}
              suffix="سؤال"
              hint="بين 5 و40 سؤالًا."
            />
            {/* البريد والرموز محتوى لاتيني: يُثبَّت اتجاهه ويبقى محاذيًا للبداية */}
            <Input
              label="البريد"
              dir="ltr"
              className="text-start"
              defaultValue="tarig@"
              error="أدخل بريدًا إلكترونيًا صحيحًا."
            />
            <Input
              label="الرمز"
              dir="ltr"
              className="text-start"
              defaultValue="MDR-2026"
              disabled
            />

            <Select
              label="المرحلة"
              placeholder="اختر مرحلة"
              options={[
                { value: "m1", label: "المرحلة المتوسطة" },
                { value: "m2", label: "المرحلة الثانوية" },
                { value: "m3", label: "الجامعية" },
              ]}
            />
            <Select
              label="اللغة"
              defaultValue="ar"
              hint="تؤثّر على اتجاه العرض."
              options={[
                { value: "ar", label: "العربية" },
                { value: "en", label: "English" },
              ]}
            />
            <Select
              label="المادة"
              placeholder="اختر مادة"
              error="هذا الحقل مطلوب."
              options={[
                { value: "math", label: "الرياضيات" },
                { value: "phys", label: "الفيزياء" },
              ]}
            />
            <Select
              label="المعلّم"
              defaultValue="t1"
              disabled
              options={[{ value: "t1", label: "غير متاح" }]}
            />
          </div>
        </div>
      </Section>

      {/* ---------- ٠٨ التقدّم ---------- */}
      <Section
        index={8}
        title="التقدّم"
        note="الجزء الحبري ما أُتقن، والبرتقالي ما ينقص. هذا كل شيء."
      >
        <div className="rounded-card border border-line bg-paper p-8">
          <Spec label="بلا فجوة" align="start">
            <ProgressBar label="أساسيات الكسور" value={92} caption="14 من 15 سؤالًا." />
          </Spec>
          <Spec label="فجوة صغيرة" align="start">
            <ProgressBar label="المعادلات الخطية" value={68} gap={17} />
          </Spec>
          <Spec label="فجوة واسعة" align="start">
            <ProgressBar
              label="المتتاليات الهندسية"
              value={31}
              gap={44}
              caption="راجع الدرس الثالث قبل المتابعة."
            />
          </Spec>
          <Spec label="رفيع" align="start">
            <div className="space-y-4">
              <ProgressBar value={78} size="sm" showValue={false} />
              <ProgressBar value={45} gap={30} size="sm" showValue={false} />
            </div>
          </Spec>
        </div>
      </Section>

      {/* ---------- ٠٩ الانتظار ---------- */}
      <Section
        index={9}
        title="الانتظار"
        note="نبضة عتامة واحدة. لا لمعان يمرّ، ولا تدرّج."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <p className="label-eyebrow mb-5">أسطر</p>
            <SkeletonText lines={4} />
          </Card>
          <Card>
            <p className="label-eyebrow mb-5">بإيقاع العلامة</p>
            <SkeletonBars />
          </Card>
          <Card className="md:col-span-2">
            <p className="label-eyebrow mb-5">بطاقة قيد التحميل</p>
            <div className="flex items-start gap-4">
              <Skeleton className="size-11 shrink-0" />
              <div className="min-w-0 flex-1 space-y-3">
                <Skeleton className="h-4 w-1/3" />
                <SkeletonText lines={2} />
                <Skeleton className="h-2.5 w-full" />
              </div>
            </div>
          </Card>
        </div>
      </Section>

      {/* ---------- ١٠ الفراغ ---------- */}
      <Section
        index={10}
        title="الفراغ"
        note="فراغ محايد، وفراغ ناتج عن قياس. ليسا الشيء نفسه."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <EmptyState
            title="لا مسارات بعد"
            description="ابدأ بمسار واحد، وسيبني مُدرِك خريطة المفاهيم تلقائيًا من أسئلتك."
            action={<Button icon={<IconPlus />}>أنشئ أول مسار</Button>}
          />
          <EmptyState
            tone="gap"
            title="لم نجد فجوات — بعد"
            description="أجب على خمسة أسئلة على الأقل حتى يصبح القياس ذا معنى."
            action={<Button variant="ghost">أكمل التقييم</Button>}
          />
        </div>
      </Section>

      {/* ---------- التذييل ---------- */}
      <footer className="flex flex-wrap items-center justify-between gap-6 border-t border-line pt-10">
        <MudrikLockupEn className="w-[132px]" />
        <p className="text-[12.5px] text-muted">
          نظام تصميم مُدرِك — هاكاثون طويق مع Google
        </p>
      </footer>
    </main>
  );
}
