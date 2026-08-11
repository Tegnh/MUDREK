import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "مُدرِك",
    short_name: "مُدرِك",
    description:
      "المعلم يرفع الاختبار، الذكاء الاصطناعي يشخّص كل طالب على حدة، والطالب يتلقى تمرينًا موجّهًا لفجوته تحديدًا — لا لدرجته فقط.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f2",
    theme_color: "#0a141d",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
