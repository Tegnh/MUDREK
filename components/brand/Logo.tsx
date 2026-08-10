import type { SVGProps } from "react";

/* ==========================================================================
   شعار مُدرِك
   العلامة أربعة أشرطة: ثلاثة أسطر حبرية، وشريط قصير برتقالي في السطر الثاني
   هو الفجوة. هذا الشريط هو مصدر كل استخدام للبرتقالي في النظام كله.
   ========================================================================== */

export type LogoTone = "ink" | "surface" | "mono";

type Palette = { bar: string; gap: string };

function palette(tone: LogoTone): Palette {
  switch (tone) {
    case "surface":
      return { bar: "var(--color-surface)", gap: "var(--color-accent)" };
    case "mono":
      // ختم أحادي اللون — يفقد الفجوة لونها عمدًا (طباعة، حفر، ووترمارك)
      return { bar: "currentColor", gap: "currentColor" };
    default:
      return { bar: "var(--color-ink)", gap: "var(--color-accent)" };
  }
}

type BaseProps = Omit<SVGProps<SVGSVGElement>, "viewBox" | "children"> & {
  tone?: LogoTone;
  /** نص بديل. إن أُهمل عُوملت العلامة كعنصر زخرفي وأُخفيت عن قارئ الشاشة. */
  title?: string;
};

function a11y(title?: string) {
  return title
    ? ({ role: "img" as const, "aria-label": title })
    : ({ "aria-hidden": true, focusable: false } as const);
}

/** الأشرطة الأربعة في إحداثيات 64×64 الأصلية. */
function Bars({ bar, gap }: Palette) {
  return (
    <>
      <rect x="14" y="12.5" width="38" height="9" rx="4.5" fill={bar} />
      <rect x="30" y="27.5" width="22" height="9" rx="4.5" fill={bar} />
      <rect x="14" y="27.5" width="11" height="9" rx="4.5" fill={gap} />
      <rect x="14" y="42.5" width="38" height="9" rx="4.5" fill={bar} />
    </>
  );
}

/* --------------------------------------------------------------------------
   العلامة المجرّدة
   -------------------------------------------------------------------------- */

export function MudrikMark({ tone = "ink", title, ...props }: BaseProps) {
  const p = palette(tone);
  return (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" {...a11y(title)} {...props}>
      <Bars {...p} />
    </svg>
  );
}

/* --------------------------------------------------------------------------
   العلامة داخل مربّع — أفاتار، أيقونة تطبيق، ختم
   نسبة الزاوية 0.21875 من الضلع، وهي نفسها في 64 و512.
   -------------------------------------------------------------------------- */

export function MudrikMarkTile({
  tone = "surface",
  title,
  background = "var(--color-dark)",
  ...props
}: BaseProps & { background?: string }) {
  const p = palette(tone);
  return (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" {...a11y(title)} {...props}>
      <rect width="64" height="64" rx="14" fill={background} />
      <g transform="translate(6.26,7.04) scale(0.78)">
        <Bars {...p} />
      </g>
    </svg>
  );
}

/* --------------------------------------------------------------------------
   كلمة MUDRIK اللاتينية — أحرف مرسومة بالمسارات، لا بخط نصّي
   -------------------------------------------------------------------------- */

function LatinWordmark({ stroke, width = 9 }: { stroke: string; width?: number }) {
  return (
    <g
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M0 60 L0 0 L20 30 L40 0 L40 60" transform="translate(0,0)" />
      <path d="M0 0 L0 40 A20 20 0 0 0 40 40 L40 0" transform="translate(57,0)" />
      <path d="M0 0 L0 60 M0 0 L14 0 A24 30 0 0 1 14 60 L0 60" transform="translate(114,0)" />
      <path
        d="M0 60 L0 0 L14 0 A16 15 0 0 1 14 30 L0 30 M13 30 L34 60"
        transform="translate(169,0)"
      />
      <path d="M0 0 L0 60" transform="translate(222,0)" />
      <path d="M0 0 L0 60 M1 33 L30 2 M1 33 L32 60" transform="translate(239,0)" />
    </g>
  );
}

/* --------------------------------------------------------------------------
   كلمة مُدرِك العربية — مرسومة بالمسارات كذلك
   -------------------------------------------------------------------------- */

function ArabicWordmark({ stroke }: { stroke: string }) {
  return (
    <g transform="translate(-7.44,4.12) scale(0.6490)">
      <g fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="452" cy="142" r="16" strokeWidth="16" />
        <path d="M437.17,147.99 C415,158 398,158 388,158" strokeWidth="16" />
        <path d="M388,158 C368,158 338,118 322,100" strokeWidth="16" />
        <path d="M322,100 C308,88 290,88 276,96" strokeWidth="16" />
        <path d="M246,90 L240,120" strokeWidth="16" />
        <path d="M240,120 C238,152 212,172 182,160" strokeWidth="16" />
        <path d="M182,160 L172,152" strokeWidth="12" />
        <path d="M140,58 L133,150" strokeWidth="16" />
        <path d="M138,65 L106,76" strokeWidth="13.6" />
        <path d="M133,150 C118,158 95,158 68,156" strokeWidth="16" />
        <path d="M92,122 L111,111" strokeWidth="12" />
      </g>
    </g>
  );
}

/* --------------------------------------------------------------------------
   الأقفال
   -------------------------------------------------------------------------- */

/** القفل اللاتيني — العلامة ثم MUDRIK. */
export function MudrikLockupEn({ tone = "ink", title = "Mudrik", ...props }: BaseProps) {
  const p = palette(tone);
  return (
    <svg viewBox="0 0 427 117" xmlns="http://www.w3.org/2000/svg" {...a11y(title)} {...props}>
      <g transform="translate(3.00,10.50) scale(1.5)">
        <Bars {...p} />
      </g>
      <g transform="translate(125.50,28.50)">
        <LatinWordmark stroke={p.bar} />
      </g>
    </svg>
  );
}

/** القفل العربي الأساسي — العلامة على اليمين، والكلمة على يسارها. */
export function MudrikLockupAr({ tone = "ink", title = "مُدرِك", ...props }: BaseProps) {
  const p = palette(tone);
  return (
    <svg viewBox="0 0 438 152" xmlns="http://www.w3.org/2000/svg" {...a11y(title)} {...props}>
      <g transform="translate(330.60,24.80) scale(1.6)">
        <Bars {...p} />
      </g>
      <ArabicWordmark stroke={p.bar} />
    </svg>
  );
}

/** القفل ثنائي اللغة — العربي فوق، وفاصل شعري، ثم اللاتيني. */
export function MudrikLockupBilingual({
  tone = "ink",
  title = "مُدرِك · Mudrik",
  ...props
}: BaseProps) {
  const p = palette(tone);
  return (
    <svg viewBox="0 0 438 241" xmlns="http://www.w3.org/2000/svg" {...a11y(title)} {...props}>
      <g transform="translate(330.60,24.80) scale(1.6)">
        <Bars {...p} />
      </g>
      <ArabicWordmark stroke={p.bar} />
      <rect
        x="114"
        y="154"
        width="210"
        height="2"
        rx="1"
        fill="var(--color-muted)"
        opacity="0.4"
      />
      <g transform="translate(137.00,178.70) scale(0.6)">
        <LatinWordmark stroke={p.bar} />
      </g>
    </svg>
  );
}

/* --------------------------------------------------------------------------
   الواجهة الموحّدة
   -------------------------------------------------------------------------- */

export type LogoVariant = "mark" | "tile" | "ar" | "en" | "bilingual";

export type LogoProps = BaseProps & { variant?: LogoVariant };

export default function Logo({ variant = "ar", ...props }: LogoProps) {
  switch (variant) {
    case "mark":
      return <MudrikMark {...props} />;
    case "tile":
      return <MudrikMarkTile {...props} />;
    case "en":
      return <MudrikLockupEn {...props} />;
    case "bilingual":
      return <MudrikLockupBilingual {...props} />;
    default:
      return <MudrikLockupAr {...props} />;
  }
}
