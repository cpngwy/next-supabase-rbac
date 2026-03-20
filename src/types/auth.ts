import type { Session } from "@supabase/supabase-js";

export type AppRole = {
  id: string;
  name: string;
  permissions: string[];
};

export type AppUser = {
  id: string;
  email: string | null;
  name: string | null;
  role: AppRole | null;
  permissions: string[];
};

export type AuthContextValue = {
  session: Session | null;
  user: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
};

