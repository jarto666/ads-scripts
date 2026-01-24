'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Sparkles,
  FolderKanban,
  FileText,
  TrendingUp,
  ArrowRight,
  Clock,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { projects } from '@/lib/api';

interface Project {
  id: string;
  name: string;
  productDescription: string;
  createdAt: string;
  updatedAt: string;
}

interface StatCard {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ElementType;
  trend?: { value: number; positive: boolean };
}

export default function DashboardPage() {
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await projects.list();
        setProjectsList(data);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // Mock data for demo - in production, these would come from API
  const stats: StatCard[] = [
    {
      label: 'Scripts Generated',
      value: 127,
      subtext: 'This month',
      icon: FileText,
      trend: { value: 23, positive: true },
    },
    {
      label: 'Active Projects',
      value: projectsList.length,
      subtext: 'Total projects',
      icon: FolderKanban,
    },
    {
      label: 'Scripts Remaining',
      value: 50,
      subtext: 'Free tier',
      icon: Sparkles,
    },
    {
      label: 'Avg. Script Score',
      value: '82',
      subtext: 'Quality score',
      icon: TrendingUp,
      trend: { value: 5, positive: true },
    },
  ];

  const recentScripts = [
    { id: '1', hook: 'Stop scrolling if you want clearer skin...', angle: 'pain_agitation', score: 85, createdAt: '2h ago' },
    { id: '2', hook: 'I was skeptical too, until I tried this...', angle: 'objection_reversal', score: 78, createdAt: '3h ago' },
    { id: '3', hook: 'The secret that dermatologists don\'t want you to know', angle: 'curiosity_hook', score: 92, createdAt: '5h ago' },
  ];

  const getScoreVariant = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'destructive';
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
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
          <p className="text-muted-foreground mt-1">Welcome back! Here&apos;s your script generation overview.</p>
        </div>
        <Button onClick={() => router.push('/projects')} className="gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="stat-card animate-fade-up"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                {stat.subtext && (
                  <p className="text-xs text-muted-foreground mt-1">{stat.subtext}</p>
                )}
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            {stat.trend && (
              <div className="flex items-center gap-1 mt-3">
                <TrendingUp className={`h-3 w-3 ${stat.trend.positive ? 'text-success' : 'text-destructive'}`} />
                <span className={`text-xs ${stat.trend.positive ? 'text-success' : 'text-destructive'}`}>
                  {stat.trend.positive ? '+' : ''}{stat.trend.value}%
                </span>
                <span className="text-xs text-muted-foreground">vs last month</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Projects */}
        <Card className="animate-fade-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-semibold">Recent Projects</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push('/projects')}>
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
                <Button onClick={() => router.push('/projects')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first project
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {projectsList.slice(0, 4).map((project, i) => (
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
        <Card className="animate-fade-up" style={{ animationDelay: '0.25s' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-semibold">Recent Scripts</CardTitle>
            <Button variant="ghost" size="sm">
              View all
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentScripts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary mb-4">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No scripts generated yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentScripts.map((script) => (
                  <div
                    key={script.id}
                    className="group p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 cursor-pointer transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm text-foreground line-clamp-1 flex-1">
                        {script.hook}
                      </p>
                      <Badge variant={getScoreVariant(script.score)} className="shrink-0">
                        {script.score}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        {script.angle.replace('_', ' ')}
                      </Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {script.createdAt}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Section */}
      <Card className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Monthly Usage</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Free tier - 50 scripts/month</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Upgrade to Pro
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Scripts used this month</span>
              <span className="font-medium text-foreground">27 / 50</span>
            </div>
            <Progress value={54} className="h-2" />
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground">Used (27)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-secondary" />
                <span className="text-xs text-muted-foreground">Remaining (23)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
