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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import {
  useProjectsControllerFindAll,
  useProjectsControllerCreate,
  useProjectsControllerDelete,
  getProjectsControllerFindAllQueryKey,
} from '@/api/generated/api';

export default function ProjectsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newProject, setNewProject] = useState({
    name: '',
    productDescription: '',
  });
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useProjectsControllerFindAll();
  const createMutation = useProjectsControllerCreate();
  const deleteMutation = useProjectsControllerDelete();

  const projectsList = data?.data ?? [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newProject.name || !newProject.productDescription) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        data: {
          name: newProject.name,
          productDescription: newProject.productDescription,
        },
      });
      toast({
        title: 'Project created',
        description: 'Your new project has been created.',
      });
      setDialogOpen(false);
      setNewProject({ name: '', productDescription: '' });
      router.push(`/projects/${result.data.id}`);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to create project',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id: projectId });
      toast({
        title: 'Project deleted',
        description: 'The project has been permanently deleted.',
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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Start by adding your product details. You can configure more settings later.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Summer Skincare Launch"
                  value={newProject.name}
                  onChange={(e) =>
                    setNewProject({ ...newProject, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Product Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your product, its key features, benefits, and what makes it unique..."
                  rows={5}
                  value={newProject.productDescription}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      productDescription: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  The more detail you provide, the better your scripts will be.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    'Create Project'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
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
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
                      <FolderKanban className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base font-semibold truncate group-hover:text-primary transition-colors">
                        {project.name}
                      </CardTitle>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
    </div>
  );
}
