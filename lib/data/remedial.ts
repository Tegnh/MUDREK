import { generateRemedial } from "@/lib/ai/generateRemedial";
import { fallbackGenerateRemedial } from "@/lib/ai/fallback";
import type { GenerateRemedialOutput } from "@/lib/ai/schemas";
import { cacheRemedial, getCachedRemedial } from "./store";
import { findMisconception } from "./misconceptions";

/**
 * يُعيد تمرينًا علاجيًا لمفهوم خاطئ، من الذاكرة المؤقّتة إن وُلِّد من قبل،
 * وإلا يستدعي Gemini (أو البديل المحلي عند الفشل) ويخزّن الناتج.
 */
export async function getOrCreateRemedial(misconceptionId: string): Promise<GenerateRemedialOutput> {
  const cached = getCachedRemedial(misconceptionId);
  if (cached) return cached;

  const misconception = findMisconception(misconceptionId);
  const promptSubject = misconception
    ? `${misconception.concept} — ${misconception.description}`
    : misconceptionId;

  let result: GenerateRemedialOutput;
  try {
    result = await generateRemedial(promptSubject);
  } catch {
    result = fallbackGenerateRemedial(
      misconceptionId,
      misconception?.description ?? "مفهوم يحتاج مراجعة.",
    );
  }

  cacheRemedial(misconceptionId, result);
  return result;
}
