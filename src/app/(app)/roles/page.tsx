"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/toast/ToastProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHeadCell,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { z } from "zod";

type RoleRow = { id: string; name: string; permissions: string[] };

const createRoleSchema = z.object({
  name: z.string().min(1),
  permissions: z.array(z.string()).default([]),
});

const updateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  permissions: z.array(z.string()).optional(),
});

function toPermissionsArray(input: string): string[] {
  return input
    .split(/[\n,]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function RolesPage() {
  const { isAdmin, loading: authLoading, refreshUser } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<RoleRow[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");

  const emptyForm = useMemo(() => ({ name: "", permissionsText: "" }), []);
  const [form, setForm] = useState(emptyForm);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchRoles = async () => {
    const res = await fetch("/api/admin/roles");
    if (!res.ok) throw new Error("Failed to load roles");
    const json = await res.json();
    setRoles(json.roles ?? []);
  };

  const refetchAll = async () => {
    setLoading(true);
    try {
      await fetchRoles();
    } catch (e: any) {
      toast({ variant: "error", title: "Load failed", message: e?.message ?? "Unknown error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) return;
    refetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAdmin]);

  const openCreate = () => {
    setMode("create");
    setEditingRoleId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (r: RoleRow) => {
    setMode("edit");
    setEditingRoleId(r.id);
    setForm({
      name: r.name,
      permissionsText: (r.permissions ?? []).join(", "),
    });
    setModalOpen(true);
  };

  const submit = async () => {
    if (!isAdmin) return;
    const permissions = toPermissionsArray(form.permissionsText);

    setSubmitting(true);
    try {
      if (mode === "create") {
        const parsed = createRoleSchema.safeParse({
          name: form.name.trim(),
          permissions,
        });
        if (!parsed.success) {
          toast({
            variant: "error",
            title: "Validation",
            message: parsed.error.issues[0]?.message,
          });
          return;
        }

        const res = await fetch("/api/admin/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ?? "Create failed");

        toast({ variant: "success", title: "Role created", message: "Role added." });
      } else {
        if (!editingRoleId) throw new Error("Missing role id.");
        const parsed = updateRoleSchema.safeParse({
          name: form.name.trim(),
          permissions,
        });
        if (!parsed.success) {
          toast({
            variant: "error",
            title: "Validation",
            message: parsed.error.issues[0]?.message,
          });
          return;
        }

        const res = await fetch(`/api/admin/roles/${editingRoleId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ?? "Update failed");

        toast({ variant: "success", title: "Role updated", message: "Changes saved." });
      }

      setModalOpen(false);
      await refetchAll();
      await refreshUser();
    } catch (e: any) {
      toast({ variant: "error", title: "Action failed", message: e?.message ?? "Unknown error" });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRole = async (r: RoleRow) => {
    if (!confirm(`Delete role "${r.name}"?`)) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/roles/${r.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Delete failed");
      toast({ variant: "success", title: "Role deleted", message: "Role removed." });
      await refetchAll();
      await refreshUser();
    } catch (e: any) {
      toast({ variant: "error", title: "Delete failed", message: e?.message ?? "Unknown error" });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="py-10">
        <Spinner />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="p-6">
        <div className="text-sm text-slate-600">Not authorized.</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Roles</div>
          <div className="mt-1 text-sm opacity-80">Assign permissions arrays to roles.</div>
        </div>
        <Button variant="accent" onClick={openCreate}>
          Create role
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHeadCell>Name</TableHeadCell>
            <TableHeadCell>Permissions</TableHeadCell>
            <TableHeadCell className="w-[160px]">Actions</TableHeadCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.name}</TableCell>
              <TableCell>
                {(r.permissions ?? []).length ? (
                  <span className="text-xs opacity-90">
                    {(r.permissions ?? []).join(", ")}
                  </span>
                ) : (
                  <span className="text-xs opacity-60">[]</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => openEdit(r)}>
                    Edit
                  </Button>
                  <Button variant="danger" onClick={() => deleteRole(r)}>
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal
        open={modalOpen}
        title={mode === "create" ? "Create role" : "Edit role"}
        onClose={() => setModalOpen(false)}
        description="Permissions should be a list of strings."
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="accent" onClick={() => void submit()} disabled={submitting}>
              {submitting ? <Spinner /> : mode === "create" ? "Create" : "Save"}
            </Button>
          </div>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div>
            <label className="text-sm font-medium">Role name</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30 dark:border-slate-800 dark:bg-slate-950"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Permissions <span className="text-xs opacity-70">(comma or newline separated)</span>
            </label>
            <textarea
              className="mt-1 min-h-[96px] w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30 dark:border-slate-800 dark:bg-slate-950"
              value={form.permissionsText}
              onChange={(e) => setForm((p) => ({ ...p, permissionsText: e.target.value }))}
              placeholder="users:manage, roles:manage"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

