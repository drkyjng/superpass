"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { CaseRow } from "@/lib/types";
import { Chip } from "@/components/ui/Chip";
import { cn, formatDate, isDischarged } from "@/lib/utils";
import { SPECIALTIES, MED_SUBS, SUR_SUBS } from "@/lib/constants";
import { loadFilters } from "@/lib/filters";
import { Settings2 } from "lucide-react";

type Folder = { specialty: "MED" | "SUR"; subspecialty: string };

function folderList(): Folder[] {
  const out: Folder[] = [];
  for (const ss of MED_SUBS) out.push({ specialty: "MED", subspecialty: ss });
  for (const ss of SUR_SUBS) out.push({ specialty: "SUR", subspecialty: ss });
  return out;
}

function applyOrdering(rows: CaseRow[]) {
  const byGroup = new Map<string, { hospital: CaseRow["hospital"]; ward: string; rows: CaseRow[] }>();

  for (const r of rows) {
    const ward = r.ward.trim();
    const key = `${r.hospital}::${ward}`;
    if (!byGroup.has(key)) byGroup.set(key, { hospital: r.hospital, ward, rows: [] });
    byGroup.get(key)!.rows.push(r);
  }

  const groups = Array.from(byGroup.values()).sort((a, b) => {
    const h = a.hospital.localeCompare(b.hospital);
    if (h !== 0) return h;
    return a.ward.localeCompare(b.ward, undefined, { numeric: true });
  });

  const ordered: { hospital: CaseRow["hospital"]; ward: string; rows: CaseRow[] }[] = [];
  for (const g of groups) {
    const list = g.rows;
    const current = list
      .filter((x) => !isDischarged(x.date_of_discharge))
      .sort((a, b) => a.date_of_admission.localeCompare(b.date_of_admission) || a.created_at.localeCompare(b.created_at));
    const discharged = list
      .filter((x) => isDischarged(x.date_of_discharge))
      .sort((a, b) => a.date_of_admission.localeCompare(b.date_of_admission) || a.created_at.localeCompare(b.created_at));
    ordered.push({ hospital: g.hospital, ward: g.ward, rows: [...current, ...discharged] });
  }
  return ordered;
}

export default function BrowsePage() {
  const supabase = useMemo(() => createClient(), []);
  const [active, setActive] = useState<Folder>({ specialty: "MED", subspecialty: "CARD" });
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filtersVersion, setFiltersVersion] = useState(0);

  // (3) Per-user clerked ticks
  const [meId, setMeId] = useState<string | null>(null);
  const [clerked, setClerked] = useState<Set<string>>(new Set());

  const folders = useMemo(() => folderList(), []);

  useEffect(() => {
    const onFocus = () => setFiltersVersion((v) => v + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  async function loadClerked(uid: string | null) {
    setMeId(uid);
    if (!uid) {
      setClerked(new Set());
      return;
    }
    const { data: ticks, error: tickErr } = await supabase
      .from("case_clerks")
      .select("case_id")
      .eq("user_id", uid);

    if (tickErr) {
      console.warn("Failed loading clerked ticks:", tickErr.message);
      setClerked(new Set());
      return;
    }
    setClerked(new Set((ticks ?? []).map((t: any) => t.case_id)));
  }

  async function toggleClerked(caseId: string, checked: boolean) {
    if (!meId) return;

    if (checked) {
      const { error } = await supabase.from("case_clerks").insert({
        user_id: meId,
        case_id: caseId,
      });
      if (error) {
        alert(error.message);
        return;
      }
      setClerked((prev) => new Set(prev).add(caseId));
    } else {
      const { error } = await supabase.from("case_clerks").delete().eq("user_id", meId).eq("case_id", caseId);
      if (error) {
        alert(error.message);
        return;
      }
      setClerked((prev) => {
        const n = new Set(prev);
        n.delete(caseId);
        return n;
      });
    }
  }

async function setDischarge(caseId: string, discharge: boolean) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const payload = discharge ? { date_of_discharge: today } : { date_of_discharge: null };

  const { error } = await supabase.from("cases").update(payload).eq("id", caseId);
  if (error) {
    alert(error.message);
    return;
  }

  // Refresh the list quickly (simplest approach)
  window.location.reload();
}
  
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      const f = loadFilters();

      let q = supabase
        .from("cases")
        .select(
          "id,specialty,subspecialty,hospital,ward,bed,name,age,sex,date_of_admission,date_of_discharge,clerkable,high_yield,conditions,signs,remarks,created_at,updated_at,created_by,updated_by,created_by_profile:profiles!cases_created_by_fkey(display_name),updated_by_profile:profiles!cases_updated_by_fkey(display_name)"
        )
        .eq("specialty", active.specialty)
        .eq("subspecialty", active.subspecialty);

      if (f.specialty) q = q.eq("specialty", f.specialty);
      if (f.subspecialty) q = q.eq("subspecialty", f.subspecialty);
      if (f.hospital) q = q.eq("hospital", f.hospital);
      if (f.ward.trim()) q = q.eq("ward", f.ward.trim());
      if (f.clerkable) q = q.eq("clerkable", f.clerkable === "true");
      if (f.high_yield) q = q.eq("high_yield", f.high_yield === "true");

      if (f.q.trim()) {
        const term = f.q.trim().replaceAll(",", " ");
        const like = `%${term}%`;
        q = q.or(`name.ilike.${like},conditions.ilike.${like},signs.ilike.${like},remarks.ilike.${like}`);
      }

      q = q.order("ward", { ascending: true }).order("date_of_admission", { ascending: true }).order("created_at", { ascending: true });

      const { data, error } = await q;
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      setRows((data ?? []) as any);

      // (3) Load clerked ticks for this user
      const { data: userData } = await supabase.auth.getUser();
      await loadClerked(userData.user?.id ?? null);
    })();
  }, [supabase, active, filtersVersion]);

  const ordered = useMemo(() => applyOrdering(rows), [rows]);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white p-3 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Folders</div>
            <div className="text-xs text-neutral-600">MED / SUR → subspecialty</div>
          </div>
          <Link
            href="/filters"
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
          >
            <Settings2 size={16} />
            Filters
          </Link>
        </div>

        <div className="mt-3 flex gap-2">
          {SPECIALTIES.map((s) => (
            <button
              key={s}
              className={cn(
                "flex-1 rounded-xl border px-3 py-2 text-sm font-medium",
                active.specialty === s ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-neutral-50 text-neutral-800 hover:bg-white"
              )}
              onClick={() => {
                if (s === "MED") setActive({ specialty: "MED", subspecialty: "CARD" });
                else setActive({ specialty: "SUR", subspecialty: "PRS" });
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {(active.specialty === "MED" ? MED_SUBS : SUR_SUBS).map((ss) => (
            <button
              key={ss}
              className={cn(
                "rounded-xl border px-2 py-2 text-xs font-semibold",
                active.subspecialty === ss ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white hover:bg-neutral-50"
              )}
              onClick={() => setActive((a) => ({ ...a, subspecialty: ss }))}
            >
              {ss}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">Loading…</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : ordered.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">No cases in this folder (with current filters).</div>
      ) : (
        <div className="space-y-3">
          {ordered.map(({ hospital, ward, rows }) => (
            <section key={`${hospital}::${ward}`} className="rounded-2xl bg-white p-3 shadow-soft">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">
                  {hospital} Ward {ward}
                </div>
                <Chip>{rows.length} cases</Chip>
              </div>

              <div className="mt-2 space-y-2">
                {rows.map((c) => {
                  const discharged = isDischarged(c.date_of_discharge);
                  return (
                    <div key={c.id} className="flex items-stretch gap-2">
                      <div className="flex items-center pl-1">
                        <input
                          type="checkbox"
                          className="h-5 w-5"
                          checked={clerked.has(c.id)}
                          onChange={(e) => toggleClerked(c.id, e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={!meId}
                          title={!meId ? "Sign in to save clerked ticks" : "Mark as clerked"}
                        />
                      </div>

                      <Link
                        href={`/cases?id=${c.id}`}
                        className={cn(
                          "block flex-1 rounded-2xl border p-3 transition hover:bg-neutral-50",
                          discharged ? "border-neutral-200 bg-neutral-50" : "border-neutral-200 bg-white"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">
                              Bed {c.bed} · {c.name} · {c.age}/{c.sex}
                            </div>
                            <div className="mt-1 text-xs text-neutral-500">
                              Adm: {formatDate(c.date_of_admission)}
                            </div>
                            <div className="mt-1 text-xs text-neutral-500">
                              Dis: {formatDate(c.date_of_discharge)}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-1">
                            {c.high_yield ? <Chip tone="good">High-yield</Chip> : null}
                            {!c.clerkable ? <Chip tone="warn">Not clerkable</Chip> : null}
                                                      <button
  className="mt-1 rounded-xl border border-neutral-200 bg-white px-2 py-1 text-xs"
  onClick={(e) => {
    e.preventDefault(); // don't follow Link
    e.stopPropagation();
    setDischarge(c.id, !discharged);
  }}
>
  {discharged ? "Click if not discharged" : "Click if discharged"}
</button>
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-600">
        Ordering: Hospital+Ward → current admissions → discharged → date of admission.
      </div>
    </div>
  );
}
