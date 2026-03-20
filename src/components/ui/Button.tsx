"use client";

import React from "react";

type ButtonVariant = "primary" | "accent" | "ghost" | "danger";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-60";

  const styles: Record<ButtonVariant, string> = {
    primary:
      "bg-primary text-white hover:bg-primary/90 border border-primary/10",
    accent:
      "bg-accent text-white hover:bg-accent/90 border border-accent/10",
    ghost:
      "bg-transparent text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800",
    danger:
      "bg-red-600 text-white hover:bg-red-600/90 border border-red-600/15",
  };

  return <button className={`${base} ${styles[variant]} ${className}`} {...props} />;
}

