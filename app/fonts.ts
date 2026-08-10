import localFont from "next/font/local";

/**
 * IBM Plex Sans Arabic, self-hosted.
 *
 * The family is loaded as two separate faces — Arabic and Latin — instead of one
 * combined face. Each subset keeps its own @font-face set (400/500/700), and the
 * font stack lists Arabic first: Arabic glyphs resolve from the Arabic file, and
 * anything it does not cover (Latin, digits, punctuation) falls through to the
 * Latin file. Same typeface either way, correct metrics per script, no CDN call
 * at build time or at runtime.
 */

export const plexArabic = localFont({
  src: [
    { path: "./fonts/plex-arabic-arabic-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/plex-arabic-arabic-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/plex-arabic-arabic-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-plex-ar",
  display: "swap",
  preload: true,
  fallback: ["Segoe UI", "Tahoma", "sans-serif"],
});

export const plexLatin = localFont({
  src: [
    { path: "./fonts/plex-arabic-latin-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/plex-arabic-latin-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/plex-arabic-latin-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-plex-latin",
  display: "swap",
  preload: true,
  fallback: ["Segoe UI", "Tahoma", "sans-serif"],
});
