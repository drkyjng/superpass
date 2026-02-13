"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      const { data } = await supabase.from("profiles").select("display_name").eq("id", u.user.id).maybeSingle();
      if (data?.display_name) setName(data.display_name);
    })();
  }, [supabase]);

  async function save() {
    setBusy(true);
    setStatus(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setBusy(false);
      setStatus("Not signed in.");
      return;
    }

    // Upsert profile
    const { error } = await supabase.from("profiles").upsert({ id: u.user.id, display_name: name }, { onConflict: "id" });
    setBusy(false);
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus("Saved.");
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-soft space-y-3">
      <div className="text-lg font-semibold">Profile</div>
      <Input label="Display name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Justin" />
      {status ? <div className="text-sm text-neutral-600">{status}</div> : null}
      <Button className="w-full" onClick={save} disabled={busy || !name.trim()}>
        Save
      </Button>
      <div className="text-xs text-neutral-500">
        This name is used when showing who created/updated a case.
      </div>
    </div>
  );
}
