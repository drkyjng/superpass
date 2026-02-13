import { cn } from "@/lib/utils";

export function Chip({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn";
}) {
  const cls =
    tone === "good"
      ? "bg-emerald-50 text-emerald-800 border-emerald-100"
      : tone === "warn"
        ? "bg-amber-50 text-amber-800 border-amber-100"
        : "bg-neutral-50 text-neutral-700 border-neutral-100";

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-1 text-xs", cls)}>
      {children}
    </span>
  );
}
