"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AppUser, AuthContextValue } from "@/types/auth";
import { supabase } from "@/lib/supabaseClient";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadUserProfile(userId: string): Promise<AppUser | null> {
  // profiles: id (uuid PK -> auth.users.id), name, email, role_id
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,name,email,role_id")
    .eq("id", userId)
    .single();

  if (profileError) return null;

  const { data: roleRow, error: roleError } = profile?.role_id
    ? await supabase
        .from("roles")
        .select("id,name,permissions")
        .eq("id", profile.role_id)
        .single()
    : { data: null, error: null };

  if (roleError) {
    return {
      id: profile.id,
      email: profile.email ?? null,
      name: profile.name ?? null,
      role: null,
      permissions: [],
    };
  }

  return {
    id: profile.id,
    email: profile.email ?? null,
    name: profile.name ?? null,
    role: roleRow
      ? {
          id: roleRow.id,
          name: roleRow.name,
          permissions: roleRow.permissions ?? [],
        }
      : null,
    permissions: roleRow?.permissions ?? [],
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthContextValue["session"]>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const value = useMemo<AuthContextValue>(() => {
    return {
      session,
      user,
      loading,
      isAdmin: user?.role?.name === "Admin",
      refreshUser: async () => {
        if (!session) return;
        setLoading(true);
        const nextProfile = await loadUserProfile(session.user.id);
        setUser(nextProfile);
        setLoading(false);
      },
    };
  }, [session, user, loading]);

  useEffect(() => {
    let alive = true;

    async function init() {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      if (!alive) return;

      setSession(data.session);
      if (!data.session) {
        setUser(null);
        setLoading(false);
        return;
      }

      const loadedProfile = await loadUserProfile(data.session.user.id);
      if (!alive) return;
      setUser(loadedProfile);
      setLoading(false);
    }

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        setSession(nextSession);
        if (!nextSession) {
          setUser(null);
          return;
        }
        const loadedProfile = await loadUserProfile(nextSession.user.id);
        setUser(loadedProfile);
      },
    );

    return () => {
      alive = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

