"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { runReminderSweep } from "@/lib/reminders/run";
import type { SweepReport } from "@/lib/reminders/types";

export type RunState = { report?: SweepReport; error?: string };

/**
 * التشغيل اليدوي لا يمرّ بـ /api/cron/reminders: ذلك المسار محميّ بسرّ مشترك
 * لا يصحّ تسريبه إلى المتصفح، والحماية هنا دور المعلم في الجلسة نفسها. نفس
 * المحرّك في الحالتين — فما يُعرض على اللجنة هو ما سيعمل ١٨:٠٠ فعلًا.
 */
export async function runSweepAction(dryRun: boolean): Promise<RunState> {
  await requireRole("teacher");

  try {
    const report = await runReminderSweep({ dryRun });
    if (!dryRun) revalidatePath("/admin/cron");
    return { report };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "تعذّر تشغيل المهمة." };
  }
}
