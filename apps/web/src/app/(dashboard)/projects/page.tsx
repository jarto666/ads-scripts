'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  FolderKanban,
  Trash2,
  Calendar,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import {
  useProjectsControllerFindAll,
  useProjectsControllerDelete,
  getProjectsControllerFindAllQueryKey,
  useProjectDraftsControllerGetDraft,
  useProjectDraftsControllerDeleteDraft,
  getProjectDraftsControllerGetDraftQueryKey,
} from '@/api/generated/api';

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useProjectsControllerFindAll();
  const { data: draftData } = useProjectDraftsControllerGetDraft({
    query: { retry: false },
  });
  const deleteMutation = useProjectsControllerDelete();
  const deleteDraftMutation = useProjectDraftsControllerDeleteDraft();

  const projectsList = data?.data ?? [];
  // Check for valid draft with id (API returns null when no draft exists)
  const draft = draftData?.data?.id ? draftData.data : null;

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to delete "${projectName}"?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id: projectId });
      toast({
        title: 'Project deleted',
        description: 'The project has been removed.',
      });
      queryClient.invalidateQueries({ queryKey: getProjectsControllerFindAllQueryKey() });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete project',
        variant: 'destructive',
      });
    }
  };

  const handleNewProjectClick = () => {
    if (draft) {
      setShowDraftDialog(true);
    } else {
      router.push('/projects/new');
    }
  };

  const handleContinueDraft = () => {
    setShowDraftDialog(false);
    router.push('/projects/new');
  };

  const handleStartFresh = async () => {
    try {
      await deleteDraftMutation.mutateAsync();
      queryClient.invalidateQueries({
        queryKey: getProjectDraftsControllerGetDraftQueryKey(),
      });
      setShowDraftDialog(false);
      router.push('/projects/new');
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to discard draft',
        variant: 'destructive',
      });
    }
  };

  const filteredProjects = projectsList.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.productDescription.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <Skeleton className="h-10 w-80" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage your UGC script generation projects
          </p>
        </div>
        <Button onClick={handleNewProjectClick} className="gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card className="py-16">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary mb-6">
              <FolderKanban className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery ? 'No projects found' : 'No projects yet'}
            </h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Create your first project to start generating UGC scripts'}
            </p>
            {!searchQuery && (
              <Button onClick={handleNewProjectClick} className="gap-2">
                <Plus className="h-4 w-4" />
                Create your first project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="group cursor-pointer hover:border-primary/30"
              onClick={() => router.push(`/projects/${project.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
                    <FolderKanban className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-semibold truncate group-hover:text-primary transition-colors">
                      {project.name}
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project.id, project.name);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="line-clamp-2 min-h-[40px]">
                  {project.productDescription}
                </CardDescription>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(project.createdAt)}
                    </span>
                    {(project as unknown as { _count?: { batches?: number } })._count?.batches !== undefined && (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {(project as unknown as { _count: { batches: number } })._count.batches} batches
                      </span>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Draft Dialog */}
      <Dialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>You have an unfinished draft</DialogTitle>
            <DialogDescription>
              {draft?.formData?.name ? (
                <>Would you like to continue working on &quot;{draft.formData.name}&quot;?</>
              ) : (
                <>Would you like to continue with your previous draft?</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleStartFresh}
              disabled={deleteDraftMutation.isPending}
            >
              {deleteDraftMutation.isPending ? 'Discarding...' : 'Start fresh'}
            </Button>
            <Button onClick={handleContinueDraft}>
              Continue draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
