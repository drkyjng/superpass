import { Suspense } from "react";
import InviteClient from "./InviteClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-neutral-600">Loading…</div>}>
      <InviteClient />
    </Suspense>
  );
}
