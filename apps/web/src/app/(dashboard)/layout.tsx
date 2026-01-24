"use client";

import { useRequireAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useRequireAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex">
        {/* Sidebar skeleton */}
        <div className="w-[260px] h-screen bg-sidebar border-r border-border p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
        {/* Content skeleton */}
        <div className="flex-1 p-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar user={user} onLogout={logout} />
      <main className="flex-1 ml-[260px] min-h-screen flex flex-col">
        <div className="p-8 flex-1">{children}</div>
      </main>
    </div>
  );
}
