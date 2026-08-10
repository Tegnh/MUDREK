import { extendTailwindMerge } from "tailwind-merge";

/**
 * دمج أصناف Tailwind مع حلّ التعارض.
 *
 * بدون الدمج يفوز الصنف المتأخّر في ملف CSS المولَّد لا المتأخّر في السلسلة،
 * فيبتلع `w-full` داخل المكوّن قيمة `w-2/3` القادمة من الاستدعاء. الدمج يجعل
 * كل مكوّن قابلًا للتجاوز من الخارج، وهو شرط أساسي في نظام تصميم.
 *
 * القيم المخصّصة في @theme مسجَّلة هنا حتى يعرف الدامج مجموعاتها.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      rounded: [{ rounded: ["card"] }],
      "shadow": [{ shadow: ["lift"] }],
      animate: [{ animate: ["breathe", "tick"] }],
    },
  },
});

type ClassValue = string | number | false | null | undefined;

export function cn(...parts: ClassValue[]): string {
  return twMerge(parts.filter(Boolean).join(" "));
}
