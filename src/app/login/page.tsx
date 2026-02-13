"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/browse";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithPassword() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(next);
  }

  async function signInWithGoogle() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      }
    });
    setBusy(false);
    if (error) setError(error.message);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-soft">
        <div className="text-lg font-semibold">Sign in</div>
        <div className="mt-1 text-sm text-neutral-600">
          Invite-only. If you don&apos;t have access, ask the app editors to invite your email in
          Supabase.
        </div>

        <div className="mt-4 space-y-3">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@connect.hku.hk"
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          {error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          <Button className="w-full" onClick={signInWithPassword} disabled={busy || !email || !password}>
            Sign in
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-neutral-200" />
            <div className="text-xs text-neutral-500">or</div>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>

          <Button className="w-full" variant="secondary" onClick={signInWithGoogle} disabled={busy}>
            Sign in with Google
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-600">
        <div className="font-semibold text-neutral-800">First-time users</div>
        <div className="mt-1">
          If public signups are disabled (recommended), you must be invited from Supabase dashboard.
          The invite email lets you set a password.
        </div>
      </div>
    </div>
  );
}
