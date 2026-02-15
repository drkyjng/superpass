"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function InviteClient() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // If Supabase detects session in URL automatically, it will be available after load.
    // We just show UI; user sets password.
  }, []);

  async function setNewPassword() {
    setBusy(true);
    setMsg(null);

    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setBusy(false);
      setMsg("Invite session not detected. Please open the invite link again.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) return setMsg(error.message);

    setMsg("Password set. Redirecting…");
    router.push("/browse");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-soft">
        <div className="text-lg font-semibold">Set your password</div>
        <div className="mt-1 text-sm text-neutral-600">
          You were invited. Set a password to finish account setup.
        </div>

        <div className="mt-4 space-y-3">
          <Input
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          {msg ? <div className="text-sm text-neutral-700">{msg}</div> : null}
          <Button className="w-full" onClick={setNewPassword} disabled={busy || password.length < 8}>
            Save password
          </Button>
        </div>
      </div>
    </div>
  );
}
