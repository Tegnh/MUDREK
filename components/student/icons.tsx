/** أيقونات صغيرة بحدّة 1.5 لمطابقة وزن أيقونات نظام التصميم (IconPlus وأخواتها). */

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 15,
  height: 15,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

export function IconPlus(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 3.25 L8 12.75 M3.25 8 L12.75 8" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 8.5 L6.5 11.5 L12.5 4.5" />
    </svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 3.5 L12 8 L5 12.5 Z" strokeLinejoin="round" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconLock(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.75" y="7.25" width="8.5" height="6" rx="1.5" />
      <path d="M5.5 7.25 V5 a2.5 2.5 0 0 1 5 0 V7.25" />
    </svg>
  );
}

export function IconDot(props: IconProps) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <circle cx="8" cy="8" r="2.75" />
    </svg>
  );
}

export function IconForward(props: IconProps) {
  // في RTL يشير الاتجاه «التالي» إلى اليسار
  return (
    <svg {...base} {...props}>
      <path d="M12.5 8 L3.5 8 M7 3.5 L2.5 8 L7 12.5" />
    </svg>
  );
}

export function IconBack(props: IconProps) {
  // في RTL يشير الاتجاه «رجوع» إلى اليمين
  return (
    <svg {...base} {...props}>
      <path d="M3.5 8 L12.5 8 M9 3.5 L13.5 8 L9 12.5" />
    </svg>
  );
}

export function IconUpload(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 12.5 V4.5 M4.75 7.5 L8 4 L11.25 7.5" />
      <path d="M3.5 12.5 h9" />
    </svg>
  );
}

export function IconHome(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 8.2 L8 4 L13 8.2" />
      <path d="M4.4 7.2 V13 h7.2 V7.2" />
    </svg>
  );
}

export function IconBridge(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 11.5 C2.5 7.5 5 5.5 8 5.5 C11 5.5 13.5 7.5 13.5 11.5" />
      <path d="M2.5 11.5 h11 M4.5 11.5 V9 M11.5 11.5 V9" />
    </svg>
  );
}

/** ثلاثة أشرطة صاعدة — إيقاع علامة مُدرِك نفسه، تُستخدم لعدّاد الالتزام. */
export function IconStreak(props: IconProps) {
  return (
    <svg width={15} height={15} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <rect x="2" y="9" width="3" height="5" rx="1" />
      <rect x="6.5" y="5.5" width="3" height="8.5" rx="1" />
      <rect x="11" y="2" width="3" height="12" rx="1" />
    </svg>
  );
}
