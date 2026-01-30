"use client";

import { useState } from "react";
import { useRequireAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useRequireAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  const sidebarUser = {
    email: user.email,
    name: typeof user.name === 'string' ? user.name : undefined,
    isAdmin: user.isAdmin,
    plan: user.plan,
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar
        user={sidebarUser}
        onLogout={logout}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <main className={cn(
        "flex-1 min-h-screen flex flex-col overflow-x-hidden transition-all duration-300",
        sidebarCollapsed ? "ml-[72px]" : "ml-[260px]"
      )}>
        <div className="p-8 flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
