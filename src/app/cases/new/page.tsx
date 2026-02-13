"use client";

import { useRouter } from "next/navigation";
import { CaseForm } from "@/components/CaseForm";

export default function NewCasePage() {
  const router = useRouter();
  return (
    <CaseForm
      mode="create"
      onSaved={(id) => {
        router.push(`/cases/${id}`);
      }}
    />
  );
}
