"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/toast/ToastProvider";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      const nextErrors: typeof fieldErrors = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0];
        if (path === "email") nextErrors.email = issue.message;
        if (path === "password") nextErrors.password = issue.message;
      }
      setFieldErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    setSubmitting(false);
    if (error) {
      const msg = error.message || "Login failed.";
      setFormError(msg);
      toast({ variant: "error", title: "Login failed", message: msg });
      return;
    }

    toast({ variant: "success", title: "Welcome back", message: "Signed in successfully." });
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <div className="text-center">
          <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Sign in
          </div>
          <div className="mt-1 text-sm opacity-70">Supabase Auth + RLS RBAC</div>
        </div>

        <Card className="p-5">
          <form className="space-y-4" onSubmit={onSubmit}>
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
                autoComplete="current-password"
              />
              {fieldErrors.password ? (
                <div className="mt-1 text-xs text-red-600">{fieldErrors.password}</div>
              ) : null}
            </div>

            {formError ? <div className="text-sm text-red-600">{formError}</div> : null}

            <Button className="w-full" variant="primary" disabled={submitting}>
              {submitting ? <Spinner /> : "Sign in"}
            </Button>

            <div className="text-center text-xs opacity-70">
              No account?{" "}
              <a className="font-medium text-accent hover:underline" href="/register">
                Create one
              </a>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

