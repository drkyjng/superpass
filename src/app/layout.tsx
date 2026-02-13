import "./globals.css";
import type { Metadata } from "next";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "OSCE Superpass",
  description: "Let's win this battle together!"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto min-h-screen max-w-md pb-24">
          <header className="sticky top-0 z-40 border-b border-neutral-200 bg-neutral-100/90 backdrop-blur">
            <div className="px-4 py-3">
              <div className="text-sm font-semibold tracking-tight">OSCE Superpass</div>
              <div className="text-xs text-neutral-600">Let's win this battle together!</div>
            </div>
          </header>

          <main className="px-4 py-4">{children}</main>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
