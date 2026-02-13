import { clsx } from "clsx";

export function cn(...inputs: Array<string | undefined | null | false>) {
  return clsx(inputs);
}

export function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  // d is YYYY-MM-DD
  const [y, m, day] = d.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !day) return d;
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  // Use local time on client; for a consistent display across devices, you could format in UTC.
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const mi = String(dt.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export function isDischarged(dateOfDischarge: string | null) {
  return !!dateOfDischarge;
}
