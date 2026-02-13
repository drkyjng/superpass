import React from "react";
import { cn } from "@/lib/utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
};

export function Button({ className, variant = "primary", size = "md", ...props }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-xl font-medium transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = size === "sm" ? "px-3 py-2 text-sm" : "px-4 py-2.5 text-sm";
  const variants: Record<string, string> = {
    primary: "bg-neutral-900 text-white hover:bg-neutral-800 shadow-soft",
    secondary: "bg-white text-neutral-900 hover:bg-neutral-50 border border-neutral-200",
    danger: "bg-red-600 text-white hover:bg-red-500 shadow-soft",
    ghost: "bg-transparent hover:bg-neutral-100 text-neutral-900"
  };

  return <button className={cn(base, sizes, variants[variant], className)} {...props} />;
}
