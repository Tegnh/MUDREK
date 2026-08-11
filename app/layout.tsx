import type { Metadata, Viewport } from "next";
import { plexArabic, plexLatin } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "مُدرِك — من ورقة الطالب إلى خطة علاجية",
    template: "%s · مُدرِك",
  },
  description:
    "المعلم يرفع الاختبار، الذكاء الاصطناعي يشخّص كل طالب على حدة، والطالب يتلقى تمرينًا موجّهًا لفجوته تحديدًا — لا لدرجته فقط.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#faf7f2",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${plexArabic.variable} ${plexLatin.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
