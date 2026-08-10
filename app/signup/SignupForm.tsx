"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { signUpAction, type AuthState } from "@/lib/auth/actions";
import { FormError } from "@/app/login/LoginForm";

const EMPTY: AuthState = {};

type Role = "teacher" | "student";

const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: "student", label: "طالب", hint: "أرفع مصادري وأختبر نفسي" },
  { value: "teacher", label: "معلم", hint: "أرفع أوراق فصلي وأشخّصها" },
];

/**
 * إنشاء الحساب.
 *
 * الدور يُختار هنا مرّة واحدة ولا يُعدَّل بعدها من الواجهة إطلاقًا — القاعدة
 * نفسها ترفض تغييره (مشغّل prevent_role_change). لذلك يُعرض كاختيار صريح
 * بحجم يليق بأثره، لا كقائمة منسدلة صغيرة.
 */
export function SignupForm({ initialRole }: { initialRole: Role }) {
  const [role, setRole] = useState<Role>(initialRole);
  const [state, submit, pending] = useActionState(signUpAction, EMPTY);

  return (
    <div className="space-y-6">
      {state.error && <FormError>{state.error}</FormError>}

      <form action={submit} className="space-y-5" noValidate>
        <fieldset>
          <legend className="mb-2 block text-[13px] font-medium text-ink">أنا</legend>
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map((option) => {
              const selected = role === option.value;
              return (
                <label
                  key={option.value}
                  className={cn(
                    "cursor-pointer rounded-card border px-4 py-3.5 transition-colors",
                    selected
                      ? "border-ink bg-ink text-surface"
                      : "border-line-strong bg-paper hover:border-ink/25",
                  )}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={selected}
                    onChange={() => setRole(option.value)}
                    className="sr-only"
                  />
                  <span className="block text-[15px] font-bold tracking-[-0.01em]">
                    {option.label}
                  </span>
                  <span
                    className={cn(
                      "mt-1 block text-[12px] leading-relaxed",
                      selected ? "text-surface/70" : "text-muted",
                    )}
                  >
                    {option.hint}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <Input
          label="الاسم"
          name="name"
          autoComplete="name"
          required
          placeholder="كما تريده أن يظهر لزملائك"
          error={state.fieldErrors?.name}
        />

        <Input
          label="البريد الإلكتروني"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          dir="ltr"
          className="text-start"
          placeholder="name@school.sa"
          error={state.fieldErrors?.email}
        />

        <Input
          label="كلمة المرور"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          dir="ltr"
          className="text-start"
          hint="٨ أحرف على الأقل."
          error={state.fieldErrors?.password}
        />

        <Input
          label="تأكيد كلمة المرور"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          dir="ltr"
          className="text-start"
          error={state.fieldErrors?.confirm}
        />

        <Button type="submit" fullWidth size="lg" loading={pending}>
          أنشئ الحساب وابدأ
        </Button>

        <p className="text-[12.5px] leading-relaxed text-muted">
          لا خطوة تأكيد بالبريد — يفتح حسابك فور إنشائه.
        </p>
      </form>

      <div className="border-t border-line pt-5">
        <p className="text-[13px] text-muted">
          لديك حساب؟{" "}
          <Link
            href={`/login?role=${role}`}
            className="font-medium text-ink underline underline-offset-4"
          >
            سجّل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignupForm;
