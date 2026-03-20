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

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  role_id: string | null;
  role_name: string | null;
  permissions?: string[];
};

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role_id: z.string().min(1),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional().or(z.literal("")),
  role_id: z.string().min(1).nullable().optional(),
});

export default function UsersPage() {
  const { isAdmin, loading: authLoading, refreshUser } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");

  const emptyForm = useMemo(() => {
    return {
      name: "",
      email: "",
      password: "",
      role_id: "",
    };
  }, []);

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchRoles = async () => {
    const res = await fetch("/api/admin/roles");
    if (!res.ok) throw new Error("Failed to load roles");
    const json = await res.json();
    setRoles(json.roles ?? []);
  };

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users");
    if (!res.ok) throw new Error("Failed to load users");
    const json = await res.json();
    setUsers(json.users ?? []);
  };

  const refetchAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchRoles(), fetchUsers()]);
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
    setForm({
      ...emptyForm,
      role_id: roles.find((r) => r.name === "User")?.id ?? roles[0]?.id ?? "",
    });
    setModalOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setMode("edit");
    setForm({
      name: u.name ?? "",
      email: u.email ?? "",
      password: "",
      role_id: u.role_id ?? "",
    });
    setModalOpen(true);
  };

  const submitEdit = async (userId: string) => {
    const parsed = updateUserSchema.safeParse({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      role_id: form.role_id ? form.role_id : null,
    });
    if (!parsed.success) {
      toast({
        variant: "error",
        title: "Validation",
        message: parsed.error.issues[0]?.message,
      });
      return;
    }

    const payload: any = {};
    if (parsed.data.name !== undefined) payload.name = parsed.data.name;
    if (parsed.data.email !== undefined) payload.email = parsed.data.email;
    if (parsed.data.role_id !== undefined) payload.role_id = parsed.data.role_id;
    const password = form.password.trim();
    if (password) payload.password = password;

    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error ?? "Update failed");
  };

  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const handleEditSubmit = async () => {
    if (!editingUserId) return;
    try {
      setSubmitting(true);
      await submitEdit(editingUserId);
      toast({ variant: "success", title: "User updated", message: "Changes saved." });
      setModalOpen(false);
      setEditingUserId(null);
      await refetchAll();
      await refreshUser();
    } catch (e: any) {
      toast({ variant: "error", title: "Update failed", message: e?.message ?? "Unknown error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSubmit = async () => {
    try {
      setSubmitting(true);
      const parsed = createUserSchema.safeParse(form);
      if (!parsed.success) {
        toast({
          variant: "error",
          title: "Validation",
          message: parsed.error.issues[0]?.message,
        });
        return;
      }
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Create failed");

      toast({ variant: "success", title: "User created", message: "New user added." });
      setModalOpen(false);
      await refetchAll();
      await refreshUser();
    } catch (e: any) {
      toast({ variant: "error", title: "Create failed", message: e?.message ?? "Unknown error" });
    } finally {
      setSubmitting(false);
    }
  };

  const onModalPrimary = async () => {
    if (mode === "create") {
      await handleCreateSubmit();
      return;
    }
    await handleEditSubmit();
  };

  const deleteUser = async (u: UserRow) => {
    if (!confirm(`Delete ${u.email ?? u.name ?? "this user"}?`)) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Delete failed");
      toast({ variant: "success", title: "User deleted", message: "User removed." });
      await refetchAll();
      await refreshUser();
    } catch (e: any) {
      toast({ variant: "error", title: "Delete failed", message: e?.message ?? "Unknown error" });
    } finally {
      setLoading(false);
    }
  };

  const openEditWithId = (u: UserRow) => {
    setEditingUserId(u.id);
    openEdit(u);
  };

  useEffect(() => {
    if (modalOpen === false) setEditingUserId(null);
  }, [modalOpen]);

  if (authLoading || loading) {
    if (!roles.length && !users.length) {
      return (
        <div className="py-10">
          <Spinner />
        </div>
      );
    }
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
          <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Users</div>
          <div className="mt-1 text-sm opacity-80">Manage user accounts and role assignments.</div>
        </div>
        <Button variant="accent" onClick={openCreate}>
          Create user
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHeadCell>Name</TableHeadCell>
            <TableHeadCell>Email</TableHeadCell>
            <TableHeadCell>Role</TableHeadCell>
            <TableHeadCell className="w-[160px]">Actions</TableHeadCell>
          </TableRow>
        </TableHeader>

        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.name ?? "-"}</TableCell>
              <TableCell>{u.email ?? "-"}</TableCell>
              <TableCell>{u.role_name ?? "-"}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => openEditWithId(u)}>
                    Edit
                  </Button>
                  <Button variant="danger" onClick={() => deleteUser(u)}>
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
        title={mode === "create" ? "Create user" : "Edit user"}
        onClose={() => setModalOpen(false)}
        description="Basic user details and role assignment."
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="accent" onClick={onModalPrimary} disabled={submitting}>
              {submitting ? <Spinner /> : mode === "create" ? "Create" : "Save"}
            </Button>
          </div>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void onModalPrimary();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Name</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30 dark:border-slate-800 dark:bg-slate-950"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30 dark:border-slate-800 dark:bg-slate-950"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">
                Password{" "}
                <span className="text-xs opacity-70">{mode === "edit" ? "(optional)" : ""}</span>
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30 dark:border-slate-800 dark:bg-slate-950"
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30 dark:border-slate-800 dark:bg-slate-950"
                value={form.role_id}
                onChange={(e) => setForm((p) => ({ ...p, role_id: e.target.value }))}
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

