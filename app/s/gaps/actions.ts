"use server";

import { getOrCreateRemedial } from "@/lib/data/remedial";
import type { GenerateRemedialOutput } from "@/lib/ai/schemas";

export async function startRemedialAction(misconceptionId: string): Promise<GenerateRemedialOutput> {
  return getOrCreateRemedial(misconceptionId);
}
