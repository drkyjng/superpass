import { Suspense } from "react";
import CasesClient from "./CasesClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-neutral-600">Loading…</div>}>
      <CasesClient />
    </Suspense>
  );
}
