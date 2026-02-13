import React from "react";

type Props = {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
};

export function Checkbox({ checked, onChange, label }: Props) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2">
      <input
        type="checkbox"
        className="h-4 w-4 accent-neutral-900"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm text-neutral-800">{label}</span>
    </label>
  );
}
