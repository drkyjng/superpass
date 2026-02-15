"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { CaseRow } from "@/lib/types";
import { cn, formatDate, isDischarged } from "@/lib/utils";
import { SPECIALTIES, MED_SUBS, SUR_SUBS } from "@/lib/constants";
import { loadFilters } from "@/lib/filters";
import { Chip } from "@/components/ui/Chip";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Folder = { specialty: "MED" | "SUR"; subspecialty: string };
type NotifRow = { id: string; title: string; body: string; created_at: string };

function bedSortKey(bed: any): { n: number; s: string } {
  const raw = String(bed ?? "").trim().toUpperCase();
  const m = raw.match(/^(\d+)\s*([A-Z]*)$/);
  if (m) return { n: parseInt(m[1], 10), s: m[2] ?? "" };

  const m2 = raw.match(/(\d+)/);
  if (m2) return { n: parseInt(m2[1], 10), s: raw.replace(m2[1], "").trim() };

  return { n: Number.POSITIVE_INFINITY, s: raw };
}

function compareBed(a: CaseRow, b: CaseRow) {
  const ka = bedSortKey((a as any).bed);
  const kb = bedSortKey((b as any).bed);
  if (ka.n !== kb.n) return ka.n - kb.n;
  const s = ka.s.localeCompare(kb.s, undefined, { numeric: true });
  if (s !== 0) return s;
  return (a.created_at ?? "").localeCompare(b.created_at ?? "");
}

function applyOrdering(rows: CaseRow[]) {
  const byGroup = new Map<string, { hospital: CaseRow["hospital"]; ward: string; rows: CaseRow[] }>();

  for (const r of rows) {
    const ward = String((r as any).ward ?? "").trim();
    const key = `${r.hospital}::${ward}`;
    if (!byGroup.has(key)) byGroup.set(key, { hospital: r.hospital, ward, rows: [] });
    byGroup.get(key)!.rows.push(r);
  }

  const groups = Array.from(byGroup.values()).sort((a, b) => {
    const h = a.hospital.localeCompare(b.hospital);
    if (h !== 0) return h;
    return a.ward.localeCompare(b.ward, undefined, { numeric: true });
  });

  return groups.map((g) => {
    const current = g.rows.filter((x) => !isDischarged(x.date_of_discharge)).sort(compareBed);
    const discharged = g.rows.filter((x) => isDischarged(x.date_of_discharge)).sort(compareBed);
    return { hospital: g.hospital, ward: g.ward, rows: [...current, ...discharged] };
  });
}

export default function BrowsePage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [active, setActive] = useState<Folder>({ specialty: "MED", subspecialty: "CARD" });

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [filtersVersion, setFiltersVersion] = useState(0);

  const [showDischarged, setShowDischarged] = useState(false);

  const [meId, setMeId] = useState<string | null>(null);
  const [clerked, setClerked] = useState<Set<string>>(new Set());

  const [unread, setUnread] = useState(0);
  const [latestNotifs, setLatestNotifs] = useState<NotifRow[]>([]);

  // Re-pull filters when user comes back from /filters
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
    const { data: ticks, error: tickErr } = await supabase.from("case_clerks").select("case_id").eq("user_id", uid);
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
      const { error } = await supabase.from("case_clerks").insert({ user_id: meId, case_id: caseId });
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
    const today = new Date().toISOString().slice(0, 10);
    const payload = discharge ? { date_of_discharge: today } : { date_of_discharge: null };

    const { error } = await supabase.from("cases").update(payload).eq("id", caseId);
    if (error) {
      alert(error.message);
      return;
    }

    // simple refresh
    setFiltersVersion((v) => v + 1);
  }

  async function loadNotifications(uid: string | null) {
    if (!uid) {
      setUnread(0);
      setLatestNotifs([]);
      return;
    }

    const { count, error: cntErr } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .is("read_at", null);

    if (cntErr) console.warn("Failed loading notifications count:", cntErr.message);
    else setUnread(count ?? 0);

    const { data, error } = await supabase
      .from("notifications")
      .select("id,title,body,created_at")
      .eq("user_id", uid)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) {
      console.warn("Failed loading notifications list:", error.message);
      setLatestNotifs([]);
      return;
    }
    setLatestNotifs((data ?? []) as any);
  }

  async function markAllNotificationsRead() {
    if (!meId) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", meId)
      .is("read_at", null);

    if (error) {
      alert(error.message);
      return;
    }
    setUnread(0);
    setLatestNotifs([]);
  }

  // Load user (for clerked + notifications)
  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      await loadClerked(uid);
      await loadNotifications(uid);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // Realtime: notifications inserted for this user
  useEffect(() => {
    if (!meId) return;

    const channel = supabase
      .channel(`notifs:${meId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${meId}`,
        },
        (payload) => {
          const n = payload.new as any as NotifRow;
          setUnread((u) => u + 1);
          setLatestNotifs((prev) => {
            const next = [n, ...prev.filter((x) => x.id !== n.id)];
            return next.slice(0, 3);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, meId]);

  /**
   * ✅ FIX (1): notifications missing for NEW high-yield cases
   * Fallback realtime listener on cases INSERT where high_yield=true.
   * This covers the exact gap: "new cases don't notify, but edits do".
   */
  useEffect(() => {
    if (!meId) return;

    const channel = supabase
      .channel("cases:insert_high_yield_fallback")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "cases",
          filter: "high_yield=eq.true",
        },
        async (payload) => {
          const c = payload.new as any;

          const createdAt = String(c?.created_at ?? new Date().toISOString());
          const synthetic: NotifRow = {
            id: `case-insert-${c?.id ?? "unknown"}-${createdAt}`,
            title: "New high-yield case",
            body: `Bed ${c?.bed ?? "?"} · ${c?.name ?? "Unnamed"} · Ward ${c?.ward ?? "?"}`,
            created_at: createdAt,
          };

          // Show immediately
          setUnread((u) => u + 1);
          setLatestNotifs((prev) => [synthetic, ...prev].slice(0, 3));

          // If your DB trigger DID insert into notifications, sync to real list/count
          await loadNotifications(meId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, meId]);

  // Load cases for current folder + filters
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
      if (f.ward?.trim()) q = q.eq("ward", f.ward.trim());
      if (f.clerkable) q = q.eq("clerkable", f.clerkable === "true");
      if (f.high_yield) q = q.eq("high_yield", f.high_yield === "true");

      if (f.q?.trim()) {
        const term = f.q.trim().replaceAll(",", " ");
        const like = `%${term}%`;
        q = q.or(`name.ilike.${like},conditions.ilike.${like},signs.ilike.${like},remarks.ilike.${like}`);
      }

      const { data, error } = await q;

      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      setRows((data ?? []) as any);
    })();
  }, [supabase, active, filtersVersion]);

  const ordered = useMemo(() => applyOrdering(rows), [rows]);

  return (
    <div className="space-y-3">
      {/* Folder / Controls */}
      <div className="rounded-2xl bg-white p-3 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Folders</div>
            <div className="text-xs text-neutral-600">MED / SUR → subspecialty</div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/filters"
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
            >
              <Settings2 size={16} />
              Filters
            </Link>

            <button
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
              onClick={() => setShowDischarged((v) => !v)}
            >
              {showDischarged ? "Hide Discharged" : "Show Discharged"}
            </button>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          {SPECIALTIES.map((s) => (
            <button
              key={s}
              className={cn(
                "flex-1 rounded-xl border px-3 py-2 text-sm font-medium",
                active.specialty === s
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-neutral-50 text-neutral-800 hover:bg-white"
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
                active.subspecialty === ss
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white hover:bg-neutral-50"
              )}
              onClick={() => setActive((a) => ({ ...a, subspecialty: ss }))}
            >
              {ss}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications banner */}
      {unread > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold">High-yield notifications ({unread})</div>
              <div className="mt-1 space-y-1 text-xs text-amber-900/90">
                {latestNotifs.map((n) => (
                  <div key={n.id} className="truncate">
                    <span className="font-medium">{n.title}:</span> {n.body}
                  </div>
                ))}
              </div>
            </div>

            <button
              className="shrink-0 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs hover:bg-amber-50"
              onClick={markAllNotificationsRead}
            >
              Mark read
            </button>
          </div>
        </div>
      ) : null}

      {/* Body */}
      {loading ? (
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">Loading…</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : ordered.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
          No cases in this folder (with current filters).
        </div>
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
                {rows
                  .filter((c) => showDischarged || !isDischarged(c.date_of_discharge))
                  .map((c) => {
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
                            discharged ? "border-neutral-200 bg-neutral-100 text-neutral-700" : "border-neutral-200 bg-white"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">
                                Bed {c.bed} · {c.name} · {c.age}/{c.sex}
                              </div>
                              <div className="mt-1 text-xs text-neutral-500">Adm: {formatDate(c.date_of_admission)}</div>
                              <div className="mt-1 text-xs text-neutral-500">Dis: {formatDate(c.date_of_discharge)}</div>
                            </div>

                            <div className="flex shrink-0 flex-col items-end gap-1">
                              {c.high_yield ? <Chip tone="good">High-yield</Chip> : null}
                              {!c.clerkable ? <Chip tone="warn">Not clerkable</Chip> : null}

                              <button
                                className="mt-1 rounded-xl border border-neutral-200 bg-white px-2 py-1 text-xs"
                                onClick={(e) => {
                                  e.preventDefault();
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
        Ordering: Hospital+Ward → current (bed asc) → discharged (bed asc).
      </div>
    </div>
  );
}
