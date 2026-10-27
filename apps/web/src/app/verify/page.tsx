"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signOutAndLeave } from "@/lib/sign-out";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";

/** The second step of sign-in for people who turned on two-step verification. */
export default function VerifyPage() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      // Nothing to verify: either already done, or two-step isn't on.
      if (!aal || aal.nextLevel !== "aal2" || aal.currentLevel === "aal2") return router.replace("/today");
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) return setError(error.message);
      const totp = data.totp.find((f) => f.status === "verified");
      if (totp) setFactorId(totp.id);
      else setError("No authenticator is set up on this account. Sign out and try again.");
    })();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\s/g, "") });
    if (error) {
      setLoading(false);
      setCode("");
      return setError("That code didn't match. Check the time on your phone and try the newest code.");
    }
    router.replace("/today");
    router.refresh();
  }

  return (
    <AuthShell
      accent="lilac"
      title="One more step"
      subtitle="Enter the 6-digit code from your authenticator app."
      signoff="Keeping your corner safe, Dovie"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
        <Field label="Verification code">
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={7}
            autoFocus
            placeholder="123 456"
            className="text-center font-mono text-lg tracking-[0.3em]"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </Field>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" loading={loading} disabled={!factorId || code.replace(/\s/g, "").length !== 6}>
          {loading ? "Checking…" : "Verify and continue"}
        </Button>
        <button
          type="button"
          onClick={() => void signOutAndLeave()}
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Use a different account
        </button>
      </form>
    </AuthShell>
  );
}
