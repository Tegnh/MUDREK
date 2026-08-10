"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { signInAction, sendMagicLinkAction, type AuthState } from "@/lib/auth/actions";

const EMPTY: AuthState = {};

/**
 * نموذج الدخول بمدخلين.
 *
 * الافتراضي كلمة المرور لا رابط الدخول: الرابط يعتمد على وصول رسالة، وهو ما
 * لا يمكن ضمانه هنا، فلا يصحّ أن يكون الطريق الوحيد. يبقى متاحًا خلف تبديل
 * صريح لمن أنشأ حسابه به من قبل.
 */
export function LoginForm({ role }: { role: "teacher" | "student" | null }) {
  const [mode, setMode] = useState<"password" | "link">("password");
  const [signInState, signIn, signInPending] = useActionState(signInAction, EMPTY);
  const [linkState, sendLink, linkPending] = useActionState(sendMagicLinkAction, EMPTY);

  if (linkState.sentTo) {
    return (
      <div className="rounded-card border border-line-strong bg-paper px-6 py-7">
        <p className="text-[17px] font-bold tracking-[-0.01em]">تفقّد بريدك</p>
        <p className="mt-2 text-[14px] leading-[1.8] text-muted">
          أرسلنا رابط دخول صالحًا لمرة واحدة إلى{" "}
          <span dir="ltr" className="inline-block font-medium text-ink">
            {linkState.sentTo}
          </span>
          . افتحه من هذا الجهاز لتبدأ.
        </p>
        <p className="mt-4 text-[12.5px] leading-relaxed text-muted">
          لم تصلك الرسالة؟ الدخول بكلمة المرور لا يحتاج بريدًا إطلاقًا.
        </p>
        <div className="mt-6">
          <Button variant="ghost" onClick={() => setMode("password")}>
            ادخل بكلمة المرور
          </Button>
        </div>
      </div>
    );
  }

  const state = mode === "password" ? signInState : linkState;
  const pending = mode === "password" ? signInPending : linkPending;

  return (
    <div className="space-y-6">
      {state.error && <FormError>{state.error}</FormError>}

      {mode === "password" ? (
        <form action={signIn} className="space-y-5" noValidate>
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
            error={signInState.fieldErrors?.email}
          />

          <Input
            label="كلمة المرور"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            dir="ltr"
            className="text-start"
            error={signInState.fieldErrors?.password}
          />

          <Button type="submit" fullWidth size="lg" loading={pending}>
            دخول
          </Button>
        </form>
      ) : (
        <form action={sendLink} className="space-y-5" noValidate>
          {role && <input type="hidden" name="role" value={role} />}

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
            error={linkState.fieldErrors?.email}
          />

          <Button type="submit" fullWidth size="lg" loading={pending}>
            أرسل رابط الدخول
          </Button>

          <p className="text-[12.5px] leading-relaxed text-muted">
            يصلك رابط صالح لمرة واحدة على بريدك. إن تأخّر، استخدم كلمة المرور.
          </p>
        </form>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <button
          type="button"
          onClick={() => setMode(mode === "password" ? "link" : "password")}
          className="text-[13px] font-medium text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          {mode === "password" ? "ادخل برابط يُرسل إلى بريدي" : "ادخل بكلمة المرور"}
        </button>

        <p className="text-[13px] text-muted">
          لا حساب لك؟{" "}
          <Link
            href={role ? `/signup?role=${role}` : "/signup"}
            className="font-medium text-ink underline underline-offset-4"
          >
            أنشئ حسابًا
          </Link>
        </p>
      </div>
    </div>
  );
}

export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-card border border-danger/25 bg-danger-wash px-4 py-3 text-[13px] leading-relaxed text-danger"
    >
      {children}
    </p>
  );
}

export default LoginForm;
