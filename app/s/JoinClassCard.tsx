"use client";

import { useActionState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { joinClassAction, type JoinClassState } from "./actions";

const EMPTY: JoinClassState = {};

/**
 * الانضمام إلى فصل معلّم.
 *
 * مسار المصادر الذاتية (رفع الملفات) يعمل بلا فصل إطلاقًا، لذلك هذه بطاقة
 * جانبية لا خطوة إلزامية: من أعطاه معلّمه رمزًا يدخله هنا فتظهر تشخيصات
 * أوراقه، ومن لا فصل له يتجاهلها ويكمل مذاكرته.
 */
export function JoinClassCard({ enrolledCount }: { enrolledCount: number }) {
  const [state, submit, pending] = useActionState(joinClassAction, EMPTY);

  return (
    <Card padding="md">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[15px] font-bold tracking-[-0.01em]">الانضمام إلى فصل</p>
        <p className="text-[12.5px] text-muted">
          {enrolledCount > 0 ? (
            <>
              أنت مسجَّل في{" "}
              <span className="tabular font-medium text-ink">{enrolledCount}</span> فصل
            </>
          ) : (
            "لست في أي فصل بعد"
          )}
        </p>
      </div>

      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
        أدخل الرمز الذي أعطاك إياه معلّمك ليصلك تشخيص أوراق اختباراتك.
      </p>

      {state.joined && (
        <p className="mt-4 rounded-card border border-line-strong bg-surface px-4 py-3 text-[13px] text-ink">
          انضممت إلى «{state.joined}».
        </p>
      )}

      <form action={submit} className="mt-4 flex flex-wrap items-start gap-3" noValidate>
        <div className="min-w-[180px] flex-1">
          <Input
            name="code"
            required
            dir="ltr"
            aria-label="رمز الانضمام"
            placeholder="A1B2C3"
            className="text-start uppercase tracking-[0.14em]"
            error={state.error}
          />
        </div>
        <Button type="submit" loading={pending}>
          انضم
        </Button>
      </form>
    </Card>
  );
}

export default JoinClassCard;
