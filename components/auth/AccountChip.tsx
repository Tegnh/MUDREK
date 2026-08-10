import { cn } from "@/lib/cn";
import { signOutAction } from "@/lib/auth/actions";

/**
 * هوية الحساب الحالي وزرّ الخروج في الترويسة.
 *
 * مكوّن خادم بلا حالة: الخروج نموذج يستدعي Server Action مباشرة، فلا يحتاج
 * جافاسكربت على العميل ويعمل قبل اكتمال الترطيب (hydration).
 *
 * الأصناف مكتوبة كاملةً في الجدولين أدناه لا مركّبة من متغيّرات: ماسح
 * Tailwind يقرأ النصّ المصدري حرفيًا، وأي `hover:${x}` لا يصل إلى الإخراج.
 */

const TONES = {
  light: {
    name: "text-ink",
    email: "text-muted",
    button:
      "border-line-strong text-muted hover:border-ink/30 hover:bg-ink/[0.045] hover:text-ink",
  },
  dark: {
    name: "text-surface",
    email: "text-surface/60",
    button:
      "border-surface/25 text-surface/70 hover:border-surface/50 hover:bg-surface/10 hover:text-surface",
  },
} as const;

export function AccountChip({
  name,
  email,
  tone = "light",
}: {
  name: string;
  email: string;
  /** dark للترويسات على خلفية حبرية. */
  tone?: keyof typeof TONES;
}) {
  const t = TONES[tone];

  return (
    <div className="flex shrink-0 items-center gap-3">
      <span className="hidden min-w-0 flex-col items-end leading-tight sm:flex">
        <span className={cn("max-w-[16ch] truncate text-[13px] font-medium", t.name)}>{name}</span>
        <span dir="ltr" className={cn("max-w-[20ch] truncate text-[11.5px]", t.email)}>
          {email}
        </span>
      </span>

      <form action={signOutAction}>
        <button
          type="submit"
          className={cn(
            "inline-flex min-h-9 items-center rounded-card border px-3 text-[12.5px] font-medium transition-colors",
            t.button,
          )}
        >
          خروج
        </button>
      </form>
    </div>
  );
}

export default AccountChip;
