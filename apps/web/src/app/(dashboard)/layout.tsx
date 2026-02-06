"use client";

import { useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { RotateCcw, ArrowLeft } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isApiUnavailable, logout, refetch } = useRequireAuth();
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

  if (isApiUnavailable) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-6 max-w-md">
          <div className="flex justify-center mb-8">
            <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Service unavailable
          </h1>
          <p className="mt-3 text-sm text-muted-foreground/60">
            We&apos;re having trouble connecting to the server. Please try again in a moment.
          </p>
          <div className="mt-10 flex items-center justify-center gap-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Try again
            </button>
          </div>
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
