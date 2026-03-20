"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="py-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Welcome{user?.name ? `, ${user.name}` : ""}!
        </div>
        <div className="mt-1 text-sm opacity-80">
          {user?.email ? `Signed in as ${user.email}` : "Signed in"}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Role
          </div>
          <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
            {user?.role?.name ?? "Unassigned"}
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Permissions
          </div>
          <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
            {user?.permissions?.length ?? 0}
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Profile
          </div>
          <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
            {user?.name ? "Complete" : "Needs info"}
          </div>
        </Card>
      </div>
    </div>
  );
}

