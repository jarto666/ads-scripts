"use client";

import { useRouter } from "next/navigation";
import {
  Plus,
  FolderKanban,
  FileText,
  ArrowRight,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useProjectsControllerFindAll,
  useBatchesControllerGetRecentScripts,
} from "@/api/generated/api";
import type { RecentScriptDto } from "@/api/generated/models";

// Helper to format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: projectsData, isLoading: projectsLoading } =
    useProjectsControllerFindAll();
  const { data: scriptsData, isLoading: scriptsLoading } =
    useBatchesControllerGetRecentScripts();

  const projectsList = projectsData?.data ?? [];
  const recentScripts = (scriptsData?.data ?? []) as unknown as RecentScriptDto[];

  const isLoading = projectsLoading || scriptsLoading;

  const handleScriptClick = (script: RecentScriptDto) => {
    // Navigate to project page with tab=scripts, batch and script params for highlighting
    router.push(
      `/projects/${script.projectId}?tab=scripts&batch=${script.batchId}&script=${script.id}`
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here&apos;s your script generation overview.
          </p>
        </div>
        <Button onClick={() => router.push("/projects")} className="gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Projects */}
        <Card className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-semibold">
              Recent Projects
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/projects")}
            >
              View all
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {projectsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary mb-4">
                  <FolderKanban className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">No projects yet</p>
                <Button onClick={() => router.push("/projects")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first project
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {projectsList.slice(0, 4).map((project) => (
                  <div
                    key={project.id}
                    onClick={() => router.push(`/projects/${project.id}`)}
                    className="group flex items-center gap-4 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 cursor-pointer transition-all duration-200"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                      <FolderKanban className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {project.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {project.productDescription}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Scripts */}
        <Card className="animate-fade-up" style={{ animationDelay: "0.25s" }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">
              Recent Scripts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentScripts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary mb-4">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  No scripts generated yet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentScripts.map((script) => (
                  <div
                    key={script.id}
                    onClick={() => handleScriptClick(script)}
                    className="group p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 cursor-pointer transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm text-foreground line-clamp-1 flex-1 group-hover:text-primary transition-colors">
                        {script.hook}
                      </p>
                      {/* {script.score && (
                        <Badge
                          variant={
                            script.score >= 80
                              ? "success"
                              : script.score >= 60
                              ? "warning"
                              : "destructive"
                          }
                          className="shrink-0"
                        >
                          {script.score}
                        </Badge>
                      )} */}
                    </div>
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant="outline" className="text-xs shrink-0">
                        {script.angle.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate min-w-0 flex-1">
                        {script.projectName}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(script.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
