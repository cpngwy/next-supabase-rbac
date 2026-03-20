"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/toast/ToastProvider";

export default function ProfilePage() {
  const { user, loading, refreshUser } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
  }, [user]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmed = name.trim();
    if (!trimmed) {
      toast({ variant: "error", title: "Validation", message: "Name is required." });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name: trimmed })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      toast({ variant: "error", title: "Save failed", message: error.message });
      return;
    }

    toast({ variant: "success", title: "Profile updated", message: "Your changes were saved." });
    await refreshUser();
  };

  if (loading) {
    return (
      <div className="py-10">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="p-6">
        <div className="text-sm text-slate-600">Not signed in.</div>
      </Card>
    );
  }

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Profile
        </div>
        <div className="mt-1 text-sm opacity-80">
          Update your personal info (RLS-protected).
        </div>
      </div>

      <Card className="p-6">
        <form className="space-y-4" onSubmit={onSave}>
          <div>
            <label className="text-sm font-medium">Name</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30 dark:border-slate-800 dark:bg-slate-950"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              className="mt-1 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 outline-none dark:border-slate-800 dark:bg-slate-900/60"
              value={user.email ?? ""}
              disabled
            />
            <div className="mt-1 text-xs opacity-70">
              Email changes are handled by Supabase Auth (not editable here).
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Role
              </div>
              <div className="mt-2 text-sm font-semibold">{user.role?.name ?? "-"}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Permissions
              </div>
              <div className="mt-2 text-sm font-semibold">{user.permissions?.length ?? 0}</div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? <Spinner /> : "Save"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

