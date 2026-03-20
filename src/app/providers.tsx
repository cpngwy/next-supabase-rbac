"use client";

import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/toast/ToastProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  );
}

