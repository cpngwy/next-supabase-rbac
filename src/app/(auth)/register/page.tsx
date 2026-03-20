"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/toast/ToastProvider";

const schema = z.object({
  name: z.string().min(2, "Name is required."),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string }>(
    {},
  );
  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = schema.safeParse({ name, email, password });
    if (!parsed.success) {
      const nextErrors: typeof fieldErrors = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0];
        if (path === "name") nextErrors.name = issue.message;
        if (path === "email") nextErrors.email = issue.message;
        if (path === "password") nextErrors.password = issue.message;
      }
      setFieldErrors(nextErrors);
      return;
    }

    if (!isSupabaseConfigured) {
      setFormError(null);
      setSubmitting(false);
      const msg =
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.";
      toast({ variant: "error", title: "Config missing", message: msg });
      setFormError(msg);
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: {
            name: parsed.data.name,
          },
        },
      });

      if (error) {
        const msg = error.message || "Registration failed.";
        setFormError(msg);
        toast({ variant: "error", title: "Registration failed", message: msg });
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        const msg =
          "Sign up succeeded but no user ID was returned. Check email confirmation settings.";
        setFormError(msg);
        toast({ variant: "error", title: "Registration issue", message: msg });
        return;
      }

      // Create profile row and assign default "User" role.
      const { data: userRole, error: roleError } = await supabase
        .from("roles")
        .select("id")
        .eq("name", "User")
        .single();

      if (roleError || !userRole?.id) {
        const msg = roleError?.message || 'Could not find default role "User".';
        setFormError(msg);
        toast({ variant: "error", title: "Role missing", message: msg });
        return;
      }

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: userId,
          name: parsed.data.name,
          email: parsed.data.email,
          role_id: userRole.id,
        },
        { onConflict: "id" },
      );

      if (profileError) {
        const msg = profileError.message || "Could not create your profile.";
        setFormError(msg);
        toast({ variant: "error", title: "Profile setup failed", message: msg });
        return;
      }

      toast({
        variant: "success",
        title: "Account created",
        message: "Profile created and role assigned.",
      });
      router.push("/dashboard");
    } catch (err: any) {
      const msg =
        err?.message ||
        err?.toString?.() ||
        "Failed to fetch. Check network and Supabase configuration.";
      setFormError(msg);
      toast({ variant: "error", title: "Registration failed", message: msg });
    } finally {
      setSubmitting(false);
    }

  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <div className="text-center">
          <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Create account
          </div>
          <div className="mt-1 text-sm opacity-70">
            Minimal RBAC with Supabase Auth + RLS
          </div>
        </div>

        <Card className="p-5">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-sm font-medium">Name</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30 dark:border-slate-800 dark:bg-slate-950"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
              {fieldErrors.name ? (
                <div className="mt-1 text-xs text-red-600">{fieldErrors.name}</div>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30 dark:border-slate-800 dark:bg-slate-950"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              {fieldErrors.email ? (
                <div className="mt-1 text-xs text-red-600">{fieldErrors.email}</div>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-medium">Password</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30 dark:border-slate-800 dark:bg-slate-950"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              {fieldErrors.password ? (
                <div className="mt-1 text-xs text-red-600">{fieldErrors.password}</div>
              ) : null}
            </div>

            {formError ? <div className="text-sm text-red-600">{formError}</div> : null}

            <Button className="w-full" variant="primary" disabled={submitting}>
              {submitting ? <Spinner /> : "Create account"}
            </Button>

            <div className="text-center text-xs opacity-70">
              Already have an account?{" "}
              <a className="font-medium text-accent hover:underline" href="/login">
                Sign in
              </a>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

