"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { IconBridge, IconHome, IconUpload } from "./icons";

const ITEMS = [
  { href: "/s", label: "لوحتي", Icon: IconHome },
  { href: "/s/upload", label: "رفع", Icon: IconUpload },
  { href: "/s/gaps", label: "الفجوات", Icon: IconBridge },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/s") return pathname === "/s";
  return pathname.startsWith(href);
}

/**
 * تنقّل مزدوج الشكل من مصدر حالة واحد: شريط سفلي ثابت على الجوال (< sm)،
 * وصف علوي داخل الترويسة من sm فصاعدًا. "الجوال أولًا ثم وسّع" حرفيًا هنا.
 */
export function StudentNav({ variant }: { variant: "mobile" | "inline" }) {
  const pathname = usePathname();

  if (variant === "inline") {
    return (
      <nav className="hidden items-center gap-1 sm:flex" aria-label="تنقّل الطالب">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-2 rounded-card px-3 py-2 text-[13.5px] font-medium transition-colors",
                active ? "bg-ink text-surface" : "text-muted hover:bg-ink/[0.05] hover:text-ink",
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      aria-label="تنقّل الطالب"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-[520px] items-stretch justify-around">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11.5px] font-medium transition-colors",
                active ? "text-ink" : "text-muted",
              )}
            >
              <Icon className="size-[18px]" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default StudentNav;
