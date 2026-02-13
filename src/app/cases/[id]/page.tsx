"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { CaseRow } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { CaseForm } from "@/components/CaseForm";
import { formatDate, formatDateTime } from "@/lib/utils";

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [row, setRow] = useState<CaseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [canDelete, setCanDelete] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);

    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;

    const { data, error } = await supabase
      .from("cases")
      .select(
        "id,specialty,subspecialty,hospital,ward,bed,name,age,sex,date_of_admission,date_of_discharge,clerkable,high_yield,conditions,signs,remarks,created_at,updated_at,created_by,updated_by,created_by_profile:profiles!cases_created_by_fkey(display_name),updated_by_profile:profiles!cases_updated_by_fkey(display_name)"
      )
      .eq("id", id)
      .single();

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    const r = data as any as CaseRow;
    setRow(r);
    setCanDelete(!!uid && uid === r.created_by);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function doDelete() {
    if (!row) return;
    const ok = confirm("Delete this case? This cannot be undone.");
    if (!ok) return;

    setDeleteErr(null);
    const { error } = await supabase.from("cases").delete().eq("id", row.id);
    if (error) {
      setDeleteErr(error.message);
      return;
    }
    router.push("/browse");
  }

  if (loading) {
    return <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm">Loading…</div>;
  }
  if (error || !row) {
    return <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error ?? "Not found"}</div>;
  }

  if (editing) {
    return (
      <div className="space-y-3">
        <CaseForm
          mode="edit"
          initial={row}
          onSaved={() => {
            setEditing(false);
            load();
          }}
        />
        <Button variant="secondary" className="w-full" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white p-4 shadow-soft space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-lg font-semibold">
              Ward {row.ward} · Bed {row.bed}
            </div>
            <div className="mt-1 text-sm text-neutral-700">
              {row.name} · {row.age}{row.sex}
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              {row.specialty}/{row.subspecialty} · {row.hospital}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {row.high_yield ? <Chip tone="good">High-yield</Chip> : null}
            {!row.clerkable ? <Chip tone="warn">Not clerkable</Chip> : null}
          </div>
        </div>

        <div className="mt-2 space-y-1 text-sm">
          <div>
            <span className="font-semibold">Admission:</span> {formatDate(row.date_of_admission)}
          </div>
          <div>
            <span className="font-semibold">Discharge:</span> {formatDate(row.date_of_discharge)}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-xs font-semibold text-neutral-700">Condition(s)</div>
            <div className="mt-1 text-sm text-neutral-800 whitespace-pre-wrap">{row.conditions}</div>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-xs font-semibold text-neutral-700">Sign(s)</div>
            <div className="mt-1 text-sm text-neutral-800 whitespace-pre-wrap">{row.signs}</div>
          </div>
          {row.remarks ? (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
              <div className="text-xs font-semibold text-neutral-700">Remarks</div>
              <div className="mt-1 text-sm text-neutral-800 whitespace-pre-wrap">{row.remarks}</div>
            </div>
          ) : null}
        </div>

        <div className="mt-3 rounded-2xl border border-neutral-200 bg-white p-3 text-xs text-neutral-600">
          <div>
            <span className="font-semibold text-neutral-800">Created:</span> {formatDateTime(row.created_at)} ·{" "}
            {row.created_by_profile?.display_name ?? "—"}
          </div>
          <div className="mt-1">
            <span className="font-semibold text-neutral-800">Last update:</span> {formatDateTime(row.updated_at)} ·{" "}
            {row.updated_by_profile?.display_name ?? "—"}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <Button className="w-full" onClick={() => setEditing(true)}>
            Edit
          </Button>
          {canDelete ? (
            <Button className="w-full" variant="danger" onClick={doDelete}>
              Delete (creator only)
            </Button>
          ) : (
            <Button className="w-full" variant="secondary" disabled>
              Delete (creator only)
            </Button>
          )}
          {deleteErr ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{deleteErr}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
