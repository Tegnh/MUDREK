"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { createClassAction, type NewClassState } from "./actions";

const EMPTY: NewClassState = {};

/**
 * نموذج فتح فصل، مطوي افتراضيًا.
 *
 * الفتح الافتراضي فقط حين لا فصول بعد (`startOpen`): حينها هو الإجراء
 * الوحيد المتاح على الصفحة، فإخفاؤه خلف نقرة إضافية بلا معنى.
 */
export function NewClassForm({ startOpen = false }: { startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const [state, submit, pending] = useActionState(createClassAction, EMPTY);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.createdName) {
      formRef.current?.reset();
      if (!startOpen) setOpen(false);
    }
  }, [state.createdName, startOpen]);

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        فصل جديد
      </Button>
    );
  }

  return (
    <div className="w-full rounded-card border border-line-strong bg-paper p-5 sm:p-6">
      <p className="text-[15px] font-bold tracking-[-0.01em]">فصل جديد</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
        بعد الإنشاء يظهر رمز انضمام على بطاقة الفصل — شاركه مع طلابك ليدخلوا به.
      </p>

      {state.error && (
        <p
          role="alert"
          className="mt-4 rounded-card border border-danger/25 bg-danger-wash px-4 py-3 text-[13px] text-danger"
        >
          {state.error}
        </p>
      )}

      <form ref={formRef} action={submit} className="mt-5 space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="اسم الفصل" name="name" required placeholder="أولى ثانوي — أ" />
          <Input label="المادة" name="subject" required placeholder="رياضيات" />
        </div>

        <div className="flex items-center gap-2.5">
          <Button type="submit" loading={pending}>
            أنشئ الفصل
          </Button>
          {!startOpen && (
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

export default NewClassForm;
