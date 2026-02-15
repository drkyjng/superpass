"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function InviteClient() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // Prefill display name if profile already exists (e.g. user revisiting invite flow)
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      const { data: p } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", u.user.id)
        .maybeSingle();

      if (p?.display_name) setDisplayName(p.display_name);
    })();
  }, [supabase]);

  async function completeSetup() {
    const name = displayName.trim();

    if (!name) {
      setMsg("Please enter a Profile Name.");
      return;
    }
    if (password.length < 8) {
      setMsg("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    setMsg(null);

    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setBusy(false);
      setMsg("Invite session not detected. Please open the invite link again.");
      return;
    }

    // 1) Set password
    const { error: pwErr } = await supabase.auth.updateUser({ password });
    if (pwErr) {
      setBusy(false);
      setMsg(pwErr.message);
      return;
    }

    // 2) Require profile name at registration time: write to profiles
    const { error: profErr } = await supabase
      .from("profiles")
      .upsert({ id: data.user.id, display_name: name }, { onConflict: "id" });

    if (profErr) {
      setBusy(false);
      setMsg(profErr.message);
      return;
    }

    setBusy(false);
    setMsg("Setup complete. Redirecting…");
    router.push("/browse");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-soft">
        <div className="text-lg font-semibold">Finish your account setup</div>
        <div className="mt-1 text-sm text-neutral-600">
          You were invited. Please set a Profile Name and password to complete registration.
        </div>

        <div className="mt-4 space-y-3">
          <Input
            label="Profile Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Justin"
          />

          <Input
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          {msg ? <div className="text-sm text-neutral-700">{msg}</div> : null}

          <Button
            className="w-full"
            onClick={completeSetup}
            disabled={busy || password.length < 8 || !displayName.trim()}
          >
            Complete setup
          </Button>
        </div>
      </div>
    </div>
  );
}
