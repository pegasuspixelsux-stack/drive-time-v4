"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { subscribeToAuth, type CurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      setCurrentUser(user);
      setReady(true);
    });
    return unsubscribe;
  }, [router]);

  if (!ready || !currentUser) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      <Sidebar currentUser={currentUser} />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
