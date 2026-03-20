"use client";

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary ${className}`}
      aria-label="Loading"
      role="status"
    />
  );
}

