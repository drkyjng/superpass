import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default async function AccountPage() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();

  async function signOutAction() {
    "use server";
    const supabase = createClient();
    await supabase.auth.signOut();
  }

  const user = data.user;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-soft">
        <div className="text-lg font-semibold">Account</div>
        <div className="mt-2 text-sm text-neutral-700">
          <div>
            <span className="font-medium">Email:</span> {user?.email ?? "—"}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            Invite-only · Editors can create/update any case · Creator-only delete
          </div>
        </div>

        <form action={signOutAction} className="mt-4">
          <Button variant="secondary" className="w-full" type="submit">
            Sign out
          </Button>
        </form>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-600">
        <div className="font-semibold text-neutral-800">Tip</div>
        <div className="mt-1">
          If you want display names for created/updated editors, each user should set their{" "}
          <Link className="underline" href="/profile">
            profile name
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
