"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const titleByPath: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/users": "Users",
  "/roles": "Roles",
  "/profile": "Profile",
};

export default function Navbar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const title = titleByPath[pathname] ?? "App";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/70 backdrop-blur dark:border-slate-800 dark:bg-slate-950/60 md:ml-64">
      <div className="flex h-16 items-center justify-between gap-4 px-6">
        <div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {title}
          </div>
          <div className="text-xs opacity-70">Minimal Supabase RBAC UI</div>
        </div>

        <div className="text-right">
          {loading ? (
            <div className="text-xs opacity-70">Loading...</div>
          ) : user ? (
            <div className="text-xs opacity-80">
              {user.name ?? user.email ?? "User"}
            </div>
          ) : (
            <div className="text-xs opacity-70">Not signed in</div>
          )}
        </div>
      </div>
    </header>
  );
}

