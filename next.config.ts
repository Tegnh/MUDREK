import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /*
    حزم Supabase كبيرة، وحزمة الخادم تُعاد بناؤها في كل تعديل أثناء التطوير.
    optimizePackageImports يُحوّل الاستيراد إلى الوحدة المطلوبة وحدها بدل
    سحب الحزمة كاملة، فيخفّ زمن الترجمة الأولى وحجم الحزمة معًا.
  */
  experimental: {
    optimizePackageImports: ["@supabase/ssr", "@supabase/supabase-js", "@google/genai"],
  },
};

export default nextConfig;
