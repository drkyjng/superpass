"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { HOSPITALS, SPECIALTIES, subspecialtiesFor, SEXES } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { CaseRow } from "@/lib/types";

type Props = {
  initial?: Partial<CaseRow>;
  mode: "create" | "edit";
  onSaved?: (id: string) => void;
};

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function CaseForm({ initial, mode, onSaved }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Input order exactly as requested:
  const [specialty, setSpecialty] = useState<"MED" | "SUR">((initial?.specialty as any) ?? "MED");
  const [subspecialty, setSubspecialty] = useState<string>(
    initial?.subspecialty ?? (specialty === "MED" ? "CARD" : "PRS")
  );
  const subs = subspecialtiesFor(specialty);

  const [hospital, setHospital] = useState<"QMH" | "TWH">((initial?.hospital as any) ?? "QMH");
  const [ward, setWard] = useState(initial?.ward ?? "");
  const [bed, setBed] = useState(initial?.bed ?? "");
  const [name, setName] = useState(initial?.name ?? "");

  const [age, setAge] = useState<number>(typeof initial?.age === "number" ? initial!.age : 0);
  const [sex, setSex] = useState<"M" | "F">((initial?.sex as any) ?? "M");

  const [dateOfAdmission, setDateOfAdmission] = useState(initial?.date_of_admission ?? todayISO());
  const [dateOfDischarge, setDateOfDischarge] = useState<string>(initial?.date_of_discharge ?? "");

  const [clerkable, setClerkable] = useState<boolean>(initial?.clerkable ?? true);
  const [highYield, setHighYield] = useState<boolean>(initial?.high_yield ?? false);

  const [conditions, setConditions] = useState(initial?.conditions ?? "");
  const [signs, setSigns] = useState(initial?.signs ?? "");
  const [remarks, setRemarks] = useState(initial?.remarks ?? "");

  function validate(): string | null {
    if (!specialty) return "Specialty is required.";
    if (!subspecialty) return "Subspecialty is required.";
    if (!hospital) return "Hospital is required.";
    if (!ward.trim()) return "Ward is required.";
    if (!bed.trim()) return "Bed is required.";
    if (!name.trim()) return "Name is required.";
    if (!Number.isFinite(age) || age < 0 || age > 120) return "Age must be 0–120.";
    if (!sex) return "Sex is required.";
    if (!dateOfAdmission) return "Date of admission is required.";
    if (dateOfDischarge && dateOfDischarge < dateOfAdmission) return "Discharge date cannot be earlier than admission date.";
    if (!conditions.trim()) return "Condition(s) is required.";
    if (!signs.trim()) return "Sign(s) is required.";
    // subspecialty validity
    if (!subs.includes(subspecialty as any)) return "Invalid subspecialty for selected specialty.";
    return null;
  }

  async function save() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setBusy(true);
    setError(null);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      setBusy(false);
      setError("Not signed in.");
      return;
    }

    const payload = {
      specialty,
      subspecialty,
      hospital,
      ward: ward.trim(),
      bed: bed.trim(),
      name: name.trim(),
      age,
      sex,
      date_of_admission: dateOfAdmission,
      date_of_discharge: dateOfDischarge ? dateOfDischarge : null,
      clerkable,
      high_yield: highYield,
      conditions: conditions.trim(),
      signs: signs.trim(),
      remarks: remarks.trim() ? remarks.trim() : null
    };

    if (mode === "create") {
      const insert = {
        ...payload,
        created_by: userData.user.id,
        updated_by: userData.user.id
      };
      const { data, error } = await supabase.from("cases").insert(insert).select("id").single();
      setBusy(false);
      if (error) {
        setError(error.message);
        return;
      }
      onSaved?.(data.id);
      return;
    }

    // edit
    if (!initial?.id) {
      setBusy(false);
      setError("Missing case id.");
      return;
    }

    const { data, error } = await supabase.from("cases").update(payload).eq("id", initial.id).select("id").single();
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSaved?.(data.id);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white p-4 shadow-soft space-y-3">
        <div className="text-lg font-semibold">{mode === "create" ? "Add case" : "Edit case"}</div>

        <Select
          label="Specialty (required)"
          value={specialty}
          onChange={(e) => {
            const s = e.target.value as "MED" | "SUR";
            setSpecialty(s);
            const nextSubs = subspecialtiesFor(s);
            setSubspecialty(nextSubs[0]);
          }}
        >
          {SPECIALTIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>

        <Select
          label="Subspecialty (required)"
          value={subspecialty}
          onChange={(e) => setSubspecialty(e.target.value)}
        >
          {subs.map((ss) => (
            <option key={ss} value={ss}>
              {ss}
            </option>
          ))}
        </Select>

        <Select label="Hospital (required)" value={hospital} onChange={(e) => setHospital(e.target.value as any)}>
          {HOSPITALS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </Select>

        <Input label="Ward (required)" value={ward} onChange={(e) => setWard(e.target.value)} placeholder="e.g., 7A" />
        <Input label="Bed (required)" value={bed} onChange={(e) => setBed(e.target.value)} placeholder="e.g., 12" />
        <Input label="Name (required)" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Mr C" />

        <Input
          label="Age (required)"
          type="number"
          value={String(age)}
          onChange={(e) => setAge(parseInt(e.target.value || "0", 10))}
          min={0}
          max={120}
        />

        <Select label="Sex (required)" value={sex} onChange={(e) => setSex(e.target.value as any)}>
          {SEXES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>

        <Input
          label="Date of admission (required)"
          type="date"
          value={dateOfAdmission}
          onChange={(e) => setDateOfAdmission(e.target.value)}
        />
        <Input
          label="Date of discharge (optional)"
          type="date"
          value={dateOfDischarge}
          onChange={(e) => setDateOfDischarge(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-2">
          <Checkbox checked={clerkable} onChange={setClerkable} label="Clerkable" />
          <Checkbox checked={highYield} onChange={setHighYield} label="High-yield" />
        </div>

        <Textarea label="Condition(s) (required)" value={conditions} onChange={(e) => setConditions(e.target.value)} rows={3} />
        <Textarea label="Sign(s) (required)" value={signs} onChange={(e) => setSigns(e.target.value)} rows={3} />
        <Textarea label="Remarks (optional)" value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} />

        {error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        <Button className="w-full" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
