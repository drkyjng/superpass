import React from "react";
import { cn } from "@/lib/utils";

type Props = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
};

export function Select({ label, className, children, ...props }: Props) {
  return (
    <label className="block">
      {label ? <div className="mb-1 text-sm font-medium text-neutral-800">{label}</div> : null}
      <select
        className={cn(
          "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none",
          "focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
