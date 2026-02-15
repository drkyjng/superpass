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
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Consume invite URL params and create a session.
    // Supabase may send either:
    //  - ?code=... (PKCE)
    //  - ?token_hash=...&type=invite (OTP style)
    (async () => {
      setBusy(true);
      setMsg(null);

      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const token_hash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setMsg(`Invite link invalid/expired (code). ${error.message}`);
            setBusy(false);
            return;
          }
        } else if (token_hash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any, // expected "invite" for invite links
          });
          if (error) {
            setMsg(`Invite link invalid/expired (token). ${error.message}`);
            setBusy(false);
            return;
          }
        }

        // After exchanging, we should have a user/session
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          setMsg("Invite session not detected. Please open the invite link again.");
          setBusy(false);
          return;
        }

        // Prefill display name if a profile already exists
        const { data: p } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", data.user.id)
          .maybeSingle();

        if (p?.display_name) setDisplayName(p.display_name);

        setSessionReady(true);
        setBusy(false);
      } catch (e: any) {
        setMsg(e?.message ?? "Failed to process invite link.");
        setBusy(false);
      }
    })();
  }, [supabase]);

  async function completeSetup() {
    const name = displayName.trim();

    if (!sessionReady) {
      setMsg("Invite session not ready. Please refresh and try again.");
      return;
    }
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

    // 2) Require profile name at setup time
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
        <div className="text-lg font-semibold">Finish account setup</div>
        <div className="mt-1 text-sm text-neutral-600">
          Accepting invite… then set a Profile Name and password.
        </div>

        <div className="mt-4 space-y-3">
          <Input
            label="Profile Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
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
            disabled={busy || !sessionReady || password.length < 8 || !displayName.trim()}
          >
            Complete setup
          </Button>
        </div>
      </div>
    </div>
  );
}
