"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, PlusCircle, Search, User } from "lucide-react";

const items = [
  { href: "/browse", label: "Browse", icon: Home },
  { href: "/cases/new", label: "Add", icon: PlusCircle },
  { href: "/filters", label: "Filter", icon: Search },
  { href: "/account", label: "Account", icon: User }
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between px-3 py-2">
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex w-20 flex-col items-center gap-1 rounded-xl px-2 py-1 text-xs",
                active ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-800"
              )}
            >
              <Icon size={18} />
              <span className={cn(active ? "font-semibold" : "font-medium")}>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
