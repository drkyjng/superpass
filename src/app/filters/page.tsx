"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { HOSPITALS, SPECIALTIES, subspecialtiesFor } from "@/lib/constants";

type Filters = {
  specialty: "" | "MED" | "SUR";
  subspecialty: "";
  hospital: "" | "QMH" | "TWH";
  ward: string;
  clerkable: "" | "true" | "false";
  high_yield: "" | "true" | "false";
  q: string;
};

const KEY = "hku_osce_filters_v1";

export default function FiltersPage() {
  const [filters, setFilters] = useState<Filters>({
    specialty: "",
    subspecialty: "",
    hospital: "",
    ward: "",
    clerkable: "",
    high_yield: "",
    q: ""
  });

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        setFilters(JSON.parse(raw));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(filters));
  }, [filters]);

  const currentSubs = filters.specialty ? subspecialtiesFor(filters.specialty) : [];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-soft space-y-3">
        <div className="text-lg font-semibold">Filters</div>

        <Select
          label="Specialty"
          value={filters.specialty}
          onChange={(e) =>
            setFilters((f) => ({ ...f, specialty: e.target.value as any, subspecialty: "" }))
          }
        >
          <option value="">(Any)</option>
          {SPECIALTIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>

        <Select
          label="Subspecialty"
          value={filters.subspecialty}
          onChange={(e) => setFilters((f) => ({ ...f, subspecialty: e.target.value }))}
          disabled={!filters.specialty}
        >
          <option value="">(Any)</option>
          {currentSubs.map((ss) => (
            <option key={ss} value={ss}>
              {ss}
            </option>
          ))}
        </Select>

        <Select
          label="Hospital"
          value={filters.hospital}
          onChange={(e) => setFilters((f) => ({ ...f, hospital: e.target.value as any }))}
        >
          <option value="">(Any)</option>
          {HOSPITALS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </Select>

        <Input
          label="Ward (exact match recommended)"
          value={filters.ward}
          onChange={(e) => setFilters((f) => ({ ...f, ward: e.target.value }))}
          placeholder="e.g., 7A"
        />

        <Select
          label="Clerkable"
          value={filters.clerkable}
          onChange={(e) => setFilters((f) => ({ ...f, clerkable: e.target.value as any }))}
        >
          <option value="">(Any)</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </Select>

        <Select
          label="High-yield"
          value={filters.high_yield}
          onChange={(e) => setFilters((f) => ({ ...f, high_yield: e.target.value as any }))}
        >
          <option value="">(Any)</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </Select>

        <Input
          label="Keyword search"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          placeholder="name / conditions / signs / remarks"
        />

        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() =>
              setFilters({
                specialty: "",
                subspecialty: "",
                hospital: "",
                ward: "",
                clerkable: "",
                high_yield: "",
                q: ""
              })
            }
          >
            Clear
          </Button>
          <Button className="flex-1" onClick={() => history.back()}>
            Done
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-600">
        These filters are stored locally on your device (localStorage).
      </div>
    </div>
  );
}

export const FILTERS_STORAGE_KEY = KEY;
