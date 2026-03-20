"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { Button } from "./ui/Button";

const menuItemClass =
  "flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium transition-colors";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const items: Array<{
    href: string;
    label: string;
    adminOnly?: boolean;
  }> = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/users", label: "Users", adminOnly: true },
    { href: "/roles", label: "Roles", adminOnly: true },
    { href: "/profile", label: "Profile" },
  ];

  return (
    <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:block md:w-64">
      <div className="flex h-full flex-col bg-primary p-4 text-slate-50 shadow-soft">
        <div className="px-2 py-3">
          <div className="text-base font-semibold">RBAC</div>
          <div className="mt-1 text-xs opacity-80">Supabase + Next.js</div>
        </div>

        <nav className="mt-2 flex-1">
          <ul className="space-y-1">
            {items
              .filter((i) => !i.adminOnly || isAdmin)
              .map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`${menuItemClass} ${
                        active
                          ? "bg-accent/15 text-accent ring-1 ring-accent/30"
                          : "text-slate-100 hover:bg-primary/80"
                      }`}
                    >
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </nav>

        <div className="mt-4">
          {loading ? (
            <div className="rounded-xl bg-primary/70 px-4 py-3 text-xs opacity-90">
              Loading...
            </div>
          ) : user ? (
            <div className="rounded-xl bg-primary/70 px-4 py-3">
              <div className="truncate text-sm font-semibold">{user.name ?? user.email ?? "User"}</div>
              <div className="mt-1 text-xs opacity-80">
                {user.role?.name ?? "No role"}
              </div>
              <div className="mt-3">
                <Button
                  variant="ghost"
                  className="w-full justify-center border border-slate-200/10 text-slate-100 hover:bg-primary/90"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-primary/70 px-4 py-3 text-xs opacity-90">
              Not signed in
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

