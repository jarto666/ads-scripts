'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Filter,
  Clock,
  Zap,
  FileText,
  Camera,
  MessageSquare,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import {
  projects,
  batches,
  scripts as scriptsApi,
  type Batch,
  type Script,
} from '@/lib/api';

const SCRIPT_ANGLES = [
  { value: 'pain_agitation', label: 'Pain Agitation', description: 'Highlight the problem' },
  { value: 'objection_reversal', label: 'Objection Reversal', description: 'Address doubts' },
  { value: 'social_proof', label: 'Social Proof', description: 'Show popularity' },
  { value: 'before_after', label: 'Before/After', description: 'Show transformation' },
  { value: 'problem_solution', label: 'Problem/Solution', description: 'Classic approach' },
  { value: 'curiosity_hook', label: 'Curiosity Hook', description: 'Create intrigue' },
  { value: 'urgency_scarcity', label: 'Urgency/Scarcity', description: 'Drive action' },
  { value: 'transformation', label: 'Transformation', description: 'Show the journey' },
];

const DURATIONS = [
  { value: 15, label: '15s', description: 'Quick hook' },
  { value: 30, label: '30s', description: 'Standard' },
  { value: 45, label: '45s', description: 'Detailed' },
];

function ExportButtons({ batchId, batch }: { batchId: string; batch: Batch }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportUrls, setExportUrls] = useState<{
    pdfUrl?: string;
    csvUrl?: string;
  }>({ pdfUrl: batch.pdfUrl, csvUrl: batch.csvUrl });
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const urls = await batches.export(batchId);
      setExportUrls(urls);
      toast({
        title: 'Export ready',
        description: 'Your files are ready to download',
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Could not generate exports',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (exportUrls.pdfUrl && exportUrls.csvUrl) {
    return (
      <div className="flex gap-2">
        <a href={exportUrls.pdfUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            PDF
          </Button>
        </a>
        <a href={exportUrls.csvUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </a>
      </div>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting} className="gap-2">
      <Download className="h-4 w-4" />
      {isExporting ? 'Exporting...' : 'Export'}
    </Button>
  );
}

export default function GeneratePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentBatch, setCurrentBatch] = useState<Batch | null>(null);
  const [scriptsList, setScriptsList] = useState<Script[]>([]);
  const [expandedScript, setExpandedScript] = useState<string | null>(null);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [regenerateScriptId, setRegenerateScriptId] = useState<string | null>(null);
  const [regenerateInstruction, setRegenerateInstruction] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  const [settings, setSettings] = useState({
    count: 10,
    platform: 'tiktok',
    angles: ['pain_agitation', 'objection_reversal', 'problem_solution'],
    durations: [15, 30],
  });

  const [filterAngle, setFilterAngle] = useState<string>('all');
  const [filterDuration, setFilterDuration] = useState<string>('all');
  const [filterMinScore, setFilterMinScore] = useState<number>(0);

  const { toast } = useToast();
  const router = useRouter();

  // Check if batch is in a generating state (pending or processing)
  const isBatchGenerating = currentBatch?.status === 'pending' || currentBatch?.status === 'processing';

  useEffect(() => {
    fetchProject();
    fetchLatestBatch();
  }, [id]);

  // Poll for updates when a batch is generating
  useEffect(() => {
    if (isBatchGenerating) {
      const interval = setInterval(() => {
        refreshBatch();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isBatchGenerating]);

  // Clear isGenerating when batch finishes generating
  useEffect(() => {
    if (isGenerating && currentBatch && !isBatchGenerating) {
      setIsGenerating(false);
    }
  }, [isBatchGenerating, isGenerating]);

  const fetchProject = async () => {
    try {
      const project = await projects.get(id);
      setProjectName(project.name);
    } catch (error) {
      router.push('/projects');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLatestBatch = async () => {
    try {
      const batchList = await batches.listByProject(id);
      if (batchList.length > 0) {
        const latest = batchList[0];
        setCurrentBatch(latest);
        if (latest.status === 'completed') {
          fetchScripts(latest.id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    }
  };

  const refreshBatch = async () => {
    if (!currentBatch) return;
    try {
      const batch = await batches.get(currentBatch.id);
      setCurrentBatch(batch);
      if (batch.status === 'completed') {
        fetchScripts(batch.id);
      }
    } catch (error) {
      console.error('Failed to refresh batch:', error);
    }
  };

  const fetchScripts = async (batchId: string) => {
    try {
      const scripts = await batches.getScripts(batchId);
      setScriptsList(scripts);
    } catch (error) {
      console.error('Failed to fetch scripts:', error);
    }
  };

  const handleGenerate = async () => {
    if (settings.angles.length === 0) {
      toast({
        title: 'Select angles',
        description: 'Please select at least one angle',
        variant: 'destructive',
      });
      return;
    }

    if (settings.durations.length === 0) {
      toast({
        title: 'Select durations',
        description: 'Please select at least one duration',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const batch = await batches.create(id, {
        requestedCount: settings.count,
        platform: settings.platform,
        angles: settings.angles,
        durations: settings.durations,
      });
      setCurrentBatch(batch);
      setScriptsList([]);
      toast({
        title: 'Generation started',
        description: `Generating ${settings.count} scripts...`,
      });
      // Only clear isGenerating if batch is not generating (prevents spinner gap)
      if (batch.status !== 'pending' && batch.status !== 'processing') {
        setIsGenerating(false);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start generation',
        variant: 'destructive',
      });
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!regenerateScriptId || !regenerateInstruction) return;

    setIsRegenerating(true);
    try {
      const newScript = await scriptsApi.regenerate(
        regenerateScriptId,
        regenerateInstruction,
      );
      setScriptsList((prev) => [newScript, ...prev]);
      setRegenerateDialogOpen(false);
      setRegenerateInstruction('');
      toast({
        title: 'Script regenerated',
        description: 'A new version has been created',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to regenerate script',
        variant: 'destructive',
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const toggleAngle = (angle: string) => {
    setSettings((prev) => ({
      ...prev,
      angles: prev.angles.includes(angle)
        ? prev.angles.filter((a) => a !== angle)
        : [...prev.angles, angle],
    }));
  };

  const toggleDuration = (duration: number) => {
    setSettings((prev) => ({
      ...prev,
      durations: prev.durations.includes(duration)
        ? prev.durations.filter((d) => d !== duration)
        : [...prev.durations, duration],
    }));
  };

  const filteredScripts = scriptsList.filter((script) => {
    if (filterAngle !== 'all' && script.angle !== filterAngle) return false;
    if (filterDuration !== 'all' && script.duration !== parseInt(filterDuration)) return false;
    if (script.score !== null && script.score !== undefined && script.score < filterMinScore) return false;
    return true;
  });

  const getScoreVariant = (score: number | null | undefined): 'success' | 'warning' | 'destructive' | 'secondary' => {
    if (score === null || score === undefined) return 'secondary';
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'destructive';
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/projects/${id}`)}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Generate Scripts</h1>
          <p className="text-muted-foreground text-sm">{projectName}</p>
        </div>
      </div>

      {/* Generation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generation Settings
          </CardTitle>
          <CardDescription>
            Configure your script generation preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Number of Scripts</Label>
              <Input
                type="number"
                min={1}
                max={200}
                value={settings.count}
                onChange={(e) =>
                  setSettings({ ...settings, count: parseInt(e.target.value) || 10 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Platform</Label>
              <div className="flex gap-2">
                {['tiktok', 'reels', 'shorts'].map((platform) => (
                  <Button
                    key={platform}
                    type="button"
                    variant={settings.platform === platform ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSettings({ ...settings, platform })}
                    className="capitalize flex-1"
                  >
                    {platform}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Durations</Label>
              <div className="flex gap-2">
                {DURATIONS.map((d) => (
                  <Button
                    key={d.value}
                    type="button"
                    variant={settings.durations.includes(d.value) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleDuration(d.value)}
                    className="flex-1"
                  >
                    {d.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Script Angles</Label>
            <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
              {SCRIPT_ANGLES.map((angle) => (
                <button
                  key={angle.value}
                  type="button"
                  onClick={() => toggleAngle(angle.value)}
                  className={`p-3 rounded-xl text-left transition-all duration-200 border ${
                    settings.angles.includes(angle.value)
                      ? 'bg-primary/15 border-primary/30 text-primary'
                      : 'bg-secondary/30 border-border hover:bg-secondary/60'
                  }`}
                >
                  <p className="font-medium text-sm">{angle.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{angle.description}</p>
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || isBatchGenerating}
            className="w-full h-12 text-base gap-2"
            variant="glow"
          >
            {isGenerating || isBatchGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating... ({currentBatch?.progress || 0}%)
              </>
            ) : (
              <>
                <Zap className="h-5 w-5" />
                Generate {settings.count} Scripts
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Batch Status */}
      {currentBatch && isBatchGenerating && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15 pulse-glow">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Generating scripts...</p>
                  <p className="text-sm text-muted-foreground">This may take a few moments</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-primary">{currentBatch.progress || 0}%</span>
            </div>
            <Progress value={currentBatch.progress || 0} variant="default" className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {scriptsList.length > 0 && (
        <>
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Generated Scripts</h2>
              <p className="text-sm text-muted-foreground">
                {filteredScripts.length} of {scriptsList.length} scripts
              </p>
            </div>
            {currentBatch && currentBatch.status === 'completed' && (
              <ExportButtons batchId={currentBatch.id} batch={currentBatch} />
            )}
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  <span className="text-sm font-medium">Filters</span>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Angle</Label>
                  <Select value={filterAngle} onValueChange={setFilterAngle}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All angles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All angles</SelectItem>
                      {SCRIPT_ANGLES.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Duration</Label>
                  <Select value={filterDuration} onValueChange={setFilterDuration}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {DURATIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value.toString()}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Min Score</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={filterMinScore}
                    onChange={(e) => setFilterMinScore(parseInt(e.target.value) || 0)}
                    className="w-20"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scripts List */}
          <div className="space-y-4">
            {filteredScripts.map((script, i) => (
              <Card
                key={script.id}
                className="script-card animate-fade-up overflow-visible"
                style={{ animationDelay: `${i * 0.03}s` }}
              >
                <CardContent className="pt-5">
                  <div
                    className="cursor-pointer"
                    onClick={() =>
                      setExpandedScript(expandedScript === script.id ? null : script.id)
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {script.angle?.replace('_', ' ')}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {script.duration}s
                          </Badge>
                          <Badge variant={getScoreVariant(script.score)} className="text-xs">
                            Score: {script.score ?? '-'}
                          </Badge>
                          {script.warnings && script.warnings.length > 0 && (
                            <Badge variant="warning" className="text-xs gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {script.warnings.length} warning{script.warnings.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium text-foreground text-lg leading-snug">
                          {script.hook || 'No hook'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRegenerateScriptId(script.id);
                            setRegenerateDialogOpen(true);
                          }}
                        >
                          <RefreshCw className="h-4 w-4" />
                          Regenerate
                        </Button>
                        {expandedScript === script.id ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedScript === script.id && script.storyboard && (
                    <div className="mt-6 pt-6 border-t border-border space-y-6">
                      {/* Storyboard */}
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Camera className="h-4 w-4 text-primary" />
                          <h4 className="font-semibold text-foreground">Storyboard</h4>
                        </div>
                        <div className="space-y-3">
                          {script.storyboard.map((step, i) => (
                            <div
                              key={i}
                              className="relative pl-6 pb-3 border-l-2 border-border last:border-l-0"
                            >
                              <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                <span className="text-[10px] font-bold text-primary-foreground">{i + 1}</span>
                              </div>
                              <div className="bg-secondary/30 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {step.t}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  <span className="font-medium text-foreground">Shot:</span> {step.shot}
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium text-foreground">Spoken:</span>{' '}
                                  <span className="text-primary">&ldquo;{step.spoken}&rdquo;</span>
                                </p>
                                {step.onScreen && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    <span className="font-medium text-foreground">On-screen:</span> {step.onScreen}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        {/* CTAs */}
                        {script.ctaVariants && script.ctaVariants.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <MessageSquare className="h-4 w-4 text-primary" />
                              <h4 className="font-semibold text-foreground">CTA Variants</h4>
                            </div>
                            <div className="space-y-2">
                              {script.ctaVariants.map((cta, i) => (
                                <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
                                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                                  <span className="text-sm">{cta}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Filming Checklist */}
                        {script.filmingChecklist && script.filmingChecklist.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <FileText className="h-4 w-4 text-primary" />
                              <h4 className="font-semibold text-foreground">Filming Checklist</h4>
                            </div>
                            <div className="space-y-2">
                              {script.filmingChecklist.map((item, i) => (
                                <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
                                  <div className="w-4 h-4 rounded border border-border shrink-0" />
                                  <span className="text-sm">{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Warnings */}
                      {script.warnings && script.warnings.length > 0 && (
                        <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-warning" />
                            <h4 className="font-semibold text-warning">Warnings</h4>
                          </div>
                          <ul className="space-y-1">
                            {script.warnings.map((warning, i) => (
                              <li key={i} className="text-sm text-warning/90 flex items-start gap-2">
                                <span className="text-warning mt-1">•</span>
                                {warning}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Empty State */}
      {!currentBatch && scriptsList.length === 0 && (
        <Card className="py-16">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 mb-6">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Ready to generate scripts
            </h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              Configure your settings above and click Generate to create your UGC scripts
            </p>
          </CardContent>
        </Card>
      )}

      {/* Regenerate Dialog */}
      <Dialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Regenerate Script</DialogTitle>
            <DialogDescription>
              Provide instructions for how to modify this script
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex flex-wrap gap-2">
              {['Make it shorter', 'More aggressive', 'More premium', 'More direct', 'Add urgency'].map(
                (preset) => (
                  <Button
                    key={preset}
                    variant={regenerateInstruction === preset ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRegenerateInstruction(preset)}
                  >
                    {preset}
                  </Button>
                ),
              )}
            </div>
            <Input
              placeholder="Or enter custom instructions..."
              value={regenerateInstruction}
              onChange={(e) => setRegenerateInstruction(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setRegenerateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRegenerate}
                disabled={!regenerateInstruction || isRegenerating}
              >
                {isRegenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  'Regenerate'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
