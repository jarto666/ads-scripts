"use client";

import { useState, useEffect, use, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAtom } from "jotai";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Sparkles,
  User,
  ShieldAlert,
  Package,
  Settings2,
  FileText,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Filter,
  Clock,
  Zap,
  Camera,
  MessageSquare,
  CheckCircle2,
  Loader2,
  Users,
  Crown,
} from "lucide-react";
import { getProjectGenSettingsAtom } from "@/lib/atoms";
import { useAuth } from "@/lib/auth";
import { Credits, CreditsCost } from "@/components/ui/credits";
import { InfoTip } from "@/components/ui/info-block";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  projectsControllerFindOne,
  projectsControllerUpdate,
  batchesControllerFindAllByProject,
  batchesControllerFindOne,
  batchesControllerGetScripts,
  batchesControllerCreate,
  batchesControllerRegenerateScript,
  exportsControllerExportBatch,
  personasControllerCreate,
  personasControllerDelete,
} from "@/api/generated/api";
import type { PersonaDto, BatchDto, ScriptDto } from "@/api/generated/models";

interface ProjectData {
  id: string;
  name: string;
  productDescription: string;
  offer?: string;
  brandVoice?: string;
  forbiddenClaims: string[];
  language: string;
  region?: string;
  personas: PersonaDto[];
}

const SCRIPT_ANGLES = [
  {
    value: "pain_agitation",
    label: "Pain Agitation",
    description: "Highlight the problem",
  },
  {
    value: "objection_reversal",
    label: "Objection Reversal",
    description: "Address doubts",
  },
  {
    value: "social_proof",
    label: "Social Proof",
    description: "Show popularity",
  },
  {
    value: "before_after",
    label: "Before/After",
    description: "Show transformation",
  },
  {
    value: "problem_solution",
    label: "Problem/Solution",
    description: "Classic approach",
  },
  {
    value: "curiosity_hook",
    label: "Curiosity Hook",
    description: "Create intrigue",
  },
  {
    value: "urgency_scarcity",
    label: "Urgency/Scarcity",
    description: "Drive action",
  },
  {
    value: "transformation",
    label: "Transformation",
    description: "Show the journey",
  },
];

const DURATIONS = [
  { value: 15, label: "15s", description: "Quick hook" },
  { value: 30, label: "30s", description: "Standard" },
  { value: 45, label: "45s", description: "Detailed" },
];

// Script Card Component
function ScriptCard({
  script,
  index,
  isExpanded,
  onToggleExpand,
  onRegenerate,
  getScoreVariant,
  isVersion = false,
  versionNumber,
  versionCount = 0,
  isAdmin = false,
}: {
  script: ScriptDto;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRegenerate: () => void;
  getScoreVariant: (score: number | null | undefined) => "success" | "warning" | "destructive" | "secondary";
  isVersion?: boolean;
  versionNumber?: number;
  versionCount?: number;
  isAdmin?: boolean;
}) {
  const isRegenerating = script.status === "pending" || script.status === "generating";

  return (
    <Card
      className={`script-card animate-fade-up overflow-visible ${
        isRegenerating ? "border-primary/30 bg-primary/5" : ""
      } ${isVersion ? "border-l-2 border-l-primary/30" : ""}`}
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      <CardContent className="pt-5">
        {/* Regenerating indicator */}
        {isRegenerating && (
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-primary/20">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15">
              <RefreshCw className="h-4 w-4 text-primary animate-spin" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">Regenerating...</p>
              <p className="text-xs text-muted-foreground">
                New version is being created
              </p>
            </div>
          </div>
        )}

        <div
          className={`${!isRegenerating ? "cursor-pointer" : ""}`}
          onClick={() => !isRegenerating && onToggleExpand()}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {isVersion && versionNumber && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <RefreshCw className="h-3 w-3" />
                    v{versionNumber}
                  </Badge>
                )}
                {!isVersion && versionCount > 0 && (
                  <Badge variant="outline" className="text-xs gap-1">
                    {versionCount + 1} versions
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {script.angle?.replace("_", " ")}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {script.duration}s
                </Badge>
                {!isRegenerating && isAdmin && (
                  <Badge
                    variant={getScoreVariant(script.score)}
                    className="text-xs"
                  >
                    Score: {script.score ?? "-"}
                  </Badge>
                )}
                {script.warnings && script.warnings.length > 0 && (
                  <Badge variant="warning" className="text-xs gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {script.warnings.length}
                  </Badge>
                )}
              </div>
              <p className={`font-medium text-lg leading-snug ${
                isRegenerating ? "text-muted-foreground" : "text-foreground"
              }`}>
                {isRegenerating ? "Generating new version..." : (script.hook || "No hook")}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!isRegenerating && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRegenerate();
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              {!isRegenerating && (
                isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )
              )}
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && script.storyboard && (
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
                      <span className="text-[10px] font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                    </div>
                    <div className="bg-secondary/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {step.t}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        <span className="font-medium text-foreground">Shot:</span>{" "}
                        {step.shot}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium text-foreground">Spoken:</span>{" "}
                        <span className="text-primary">&ldquo;{step.spoken}&rdquo;</span>
                      </p>
                      {step.onScreen && (
                        <p className="text-sm text-muted-foreground mt-1">
                          <span className="font-medium text-foreground">On-screen:</span>{" "}
                          {step.onScreen}
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
                      <div
                        key={i}
                        className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30"
                      >
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
                      <div
                        key={i}
                        className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30"
                      >
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
                <ul className="space-y-1 list-disc list-inside marker:text-warning">
                  {script.warnings.map((warning, i) => (
                    <li key={i} className="text-sm text-warning/90">
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
  );
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;

  const [project, setProject] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(tabParam || "product");
  const [initialTabSet, setInitialTabSet] = useState(!!tabParam);
  const [personaDialogOpen, setPersonaDialogOpen] = useState(false);
  const [newPersona, setNewPersona] = useState({
    name: "",
    description: "",
    demographics: "",
    painPoints: "",
    desires: "",
    objections: "",
  });
  const { toast } = useToast();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    productDescription: "",
    offer: "",
    brandVoice: "",
    forbiddenClaims: "",
    language: "en",
    region: "",
  });

  // Scripts tab state
  const [isGenerating, setIsGenerating] = useState(false);
  const [batchesList, setBatchesList] = useState<BatchDto[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [scriptsList, setScriptsList] = useState<ScriptDto[]>([]);
  const [expandedScript, setExpandedScript] = useState<string | null>(null);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [regenerateScriptId, setRegenerateScriptId] = useState<string | null>(
    null,
  );
  const [regenerateInstruction, setRegenerateInstruction] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Per-project generation settings stored in localStorage via jotai
  const genSettingsAtom = useMemo(() => getProjectGenSettingsAtom(id), [id]);
  const [genSettings, setGenSettings] = useAtom(genSettingsAtom);

  // Credits per script by quality
  const CREDITS_PER_SCRIPT = {
    standard: 1,
    premium: 5,
  };

  // Calculate total scripts
  const totalScripts = genSettings.scriptsPerAngle * genSettings.angles.length;
  const totalCredits = totalScripts * CREDITS_PER_SCRIPT[genSettings.quality];

  const [filterAngle, setFilterAngle] = useState<string>("all");
  const [filterDuration, setFilterDuration] = useState<string>("all");
  const [filterMinScore, setFilterMinScore] = useState<number>(0);

  // Derived state: get currently selected batch object
  const selectedBatch =
    batchesList.find((b) => b.id === selectedBatchId) || null;

  // Check if batch is in a generating state (pending or processing)
  const isBatchGenerating =
    selectedBatch?.status === "pending" ||
    selectedBatch?.status === "processing";

  // Update URL when tab changes
  const handleTabChange = useCallback(
    (tab: string) => {
      setActiveTab(tab);
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      router.replace(url.pathname + url.search, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    fetchProject();
    fetchBatches();
  }, [id]);

  // Poll for updates when a batch is generating
  useEffect(() => {
    if (isBatchGenerating) {
      const interval = setInterval(() => {
        refreshSelectedBatch();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isBatchGenerating, selectedBatchId]);

  // Clear isGenerating when batch finishes generating
  useEffect(() => {
    if (isGenerating && selectedBatch && !isBatchGenerating) {
      setIsGenerating(false);
    }
  }, [isBatchGenerating, isGenerating]);

  // Load scripts when selected batch changes
  useEffect(() => {
    if (selectedBatchId && selectedBatch?.status === "completed") {
      fetchScripts(selectedBatchId);
    } else {
      // Clear scripts when no batch selected or batch is still generating
      setScriptsList([]);
    }
  }, [selectedBatchId, selectedBatch?.status]);

  // Auto-navigate to scripts tab if there are scripts and no tab was specified
  useEffect(() => {
    if (!initialTabSet && batchesList.length > 0) {
      const totalScripts = batchesList.reduce(
        (sum, batch) =>
          sum + (batch._count?.scripts || batch.scriptsCount || 0),
        0,
      );
      if (totalScripts > 0) {
        handleTabChange("scripts");
      }
      setInitialTabSet(true);
    }
  }, [batchesList, initialTabSet, handleTabChange]);

  const fetchProject = async () => {
    try {
      const result = await projectsControllerFindOne(id);
      const data = result.data;
      setProject(data as ProjectData);
      setFormData({
        name: data.name,
        productDescription: data.productDescription,
        offer: data.offer || "",
        brandVoice: data.brandVoice || "",
        forbiddenClaims: (data.forbiddenClaims || []).join("\n"),
        language: data.language,
        region: data.region || "",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load project",
        variant: "destructive",
      });
      router.push("/projects");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const result = await batchesControllerFindAllByProject(id);
      const batchList = result.data;
      setBatchesList(batchList);
      // Auto-select the latest batch if none selected
      if (batchList.length > 0 && !selectedBatchId) {
        setSelectedBatchId(batchList[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch batches:", error);
    }
  };

  const refreshSelectedBatch = async () => {
    if (!selectedBatchId) return;
    try {
      const result = await batchesControllerFindOne(selectedBatchId);
      const batch = result.data;
      // Update the batch in the list
      setBatchesList((prev) =>
        prev.map((b) => (b.id === batch.id ? batch : b)),
      );
    } catch (error) {
      console.error("Failed to refresh batch:", error);
    }
  };

  const handleSelectBatch = (batchId: string) => {
    setSelectedBatchId(batchId);
    setExpandedScript(null); // Reset expanded script when switching batches
  };

  const fetchScripts = async (batchId: string) => {
    try {
      const result = await batchesControllerGetScripts(batchId);
      setScriptsList(result.data);
    } catch (error) {
      console.error("Failed to fetch scripts:", error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await projectsControllerUpdate(id, {
        name: formData.name,
        productDescription: formData.productDescription,
        offer: formData.offer || undefined,
        brandVoice: formData.brandVoice || undefined,
        forbiddenClaims: formData.forbiddenClaims
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        language: formData.language,
        region: formData.region || undefined,
      });
      toast({
        title: "Saved",
        description: "Project updated successfully",
      });
      fetchProject();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save project",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreatePersona = async () => {
    if (!newPersona.name || !newPersona.description) {
      toast({
        title: "Missing fields",
        description: "Name and description are required",
        variant: "destructive",
      });
      return;
    }

    try {
      await personasControllerCreate(id, {
        name: newPersona.name,
        description: newPersona.description,
        demographics: newPersona.demographics || undefined,
        painPoints: newPersona.painPoints
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        desires: newPersona.desires
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        objections: newPersona.objections
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      toast({ title: "Persona created" });
      setPersonaDialogOpen(false);
      setNewPersona({
        name: "",
        description: "",
        demographics: "",
        painPoints: "",
        desires: "",
        objections: "",
      });
      fetchProject();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create persona",
        variant: "destructive",
      });
    }
  };

  const handleDeletePersona = async (personaId: string) => {
    try {
      await personasControllerDelete(personaId);
      toast({ title: "Persona deleted" });
      fetchProject();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete persona",
        variant: "destructive",
      });
    }
  };

  const togglePersona = (personaId: string) => {
    setGenSettings((prev) => {
      if (personaId === "all") {
        return { ...prev, personaIds: [] };
      }
      const newIds = prev.personaIds.includes(personaId)
        ? prev.personaIds.filter((id) => id !== personaId)
        : [...prev.personaIds, personaId];
      return { ...prev, personaIds: newIds };
    });
  };

  const handleGenerate = async () => {
    if (genSettings.angles.length === 0) {
      toast({
        title: "Select angles",
        description: "Please select at least one angle",
        variant: "destructive",
      });
      return;
    }

    if (genSettings.durations.length === 0) {
      toast({
        title: "Select durations",
        description: "Please select at least one duration",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await batchesControllerCreate(id, {
        requestedCount: totalScripts,
        platform: genSettings.platform as
          | "tiktok"
          | "reels"
          | "shorts"
          | "universal",
        angles: genSettings.angles,
        durations: genSettings.durations,
        personaIds:
          genSettings.personaIds.length > 0
            ? genSettings.personaIds
            : undefined,
        quality: genSettings.quality,
      });
      const batch = result.data;
      // Add new batch to the top of the list and select it
      setBatchesList((prev) => [batch, ...prev]);
      setSelectedBatchId(batch.id);
      setScriptsList([]);
      toast({
        title: "Generation started",
        description: `Generating ${totalScripts} scripts (${genSettings.scriptsPerAngle} per angle)...`,
      });
      // Only clear isGenerating if batch is not generating (prevents spinner gap)
      if (batch.status !== "pending" && batch.status !== "processing") {
        setIsGenerating(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start generation",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!regenerateScriptId || !regenerateInstruction) return;

    setIsRegenerating(true);
    try {
      const result = await batchesControllerRegenerateScript(
        regenerateScriptId,
        { instruction: regenerateInstruction },
      );
      // Add the new script (with pending status) to the list
      setScriptsList((prev) => [result.data, ...prev]);
      setRegenerateDialogOpen(false);
      setRegenerateInstruction("");
      toast({
        title: "Regeneration started",
        description: "A new version is being generated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to regenerate script",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  // Check if any scripts are currently regenerating
  const hasRegeneratingScripts = scriptsList.some(
    (s) => s.status === "pending" || s.status === "generating"
  );

  // Poll for regenerating script updates
  useEffect(() => {
    if (hasRegeneratingScripts && selectedBatchId) {
      const interval = setInterval(() => {
        fetchScripts(selectedBatchId);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [hasRegeneratingScripts, selectedBatchId]);

  const handleExport = async () => {
    if (!selectedBatchId) return;
    setIsExporting(true);
    try {
      const result = await exportsControllerExportBatch(selectedBatchId);
      const urls = result.data;
      if (urls.pdfUrl) {
        window.open(urls.pdfUrl, "_blank");
      }
      toast({
        title: "Export ready",
        description: "Your files are ready to download",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not generate exports",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const formatBatchDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleAngle = (angle: string) => {
    setGenSettings((prev) => ({
      ...prev,
      angles: prev.angles.includes(angle)
        ? prev.angles.filter((a) => a !== angle)
        : [...prev.angles, angle],
    }));
  };

  const toggleDuration = (duration: number) => {
    setGenSettings((prev) => ({
      ...prev,
      durations: prev.durations.includes(duration)
        ? prev.durations.filter((d) => d !== duration)
        : [...prev.durations, duration],
    }));
  };

  const filteredScripts = scriptsList.filter((script) => {
    if (filterAngle !== "all" && script.angle !== filterAngle) return false;
    if (
      filterDuration !== "all" &&
      script.duration !== parseInt(filterDuration)
    )
      return false;
    if (
      script.score !== null &&
      script.score !== undefined &&
      script.score < filterMinScore
    )
      return false;
    return true;
  });

  const getScoreVariant = (
    score: number | null | undefined,
  ): "success" | "warning" | "destructive" | "secondary" => {
    if (score === null || score === undefined) return "secondary";
    if (score >= 80) return "success";
    if (score >= 60) return "warning";
    return "destructive";
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
        <Skeleton className="h-12 w-full max-w-md" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/projects")}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
          <p className="text-muted-foreground text-sm">
            Manage your project and generate scripts
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <TabsList className="bg-secondary/50 p-1">
          <TabsTrigger value="product" className="gap-2">
            <Package className="h-4 w-4" />
            Product
          </TabsTrigger>
          <TabsTrigger value="audience" className="gap-2">
            <User className="h-4 w-4" />
            Audience
          </TabsTrigger>
          <TabsTrigger value="brand" className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            Brand
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger
            value="scripts"
            className="gap-2 ml-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
          >
            <Sparkles className="h-4 w-4" />
            Generate Scripts
            {batchesList.length > 0 && (
              <Badge
                variant="secondary"
                className={`ml-1 text-xs ${
                  activeTab === "scripts"
                    ? "bg-black/25 text-white"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {batchesList.reduce(
                  (sum, batch) =>
                    sum + (batch._count?.scripts || batch.scriptsCount || 0),
                  0,
                )}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Product Tab */}
        <TabsContent value="product" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
              <CardDescription>
                Tell us about your product. The more detail you provide, the
                better your scripts will be.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offer" className="flex items-center">
                    Offer (optional)
                    <InfoTip>
                      Promotional offers get woven into CTAs and closing hooks.
                      Examples: &quot;20% off&quot;, &quot;Free shipping&quot;,
                      &quot;Limited time&quot;.
                    </InfoTip>
                  </Label>
                  <Input
                    id="offer"
                    placeholder="e.g., 20% off, Free shipping, Buy 1 Get 1..."
                    value={formData.offer}
                    onChange={(e) =>
                      setFormData({ ...formData, offer: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="productDescription"
                  className="flex items-center"
                >
                  Product Description
                  <InfoTip>
                    The core context for all generated scripts. Describe what
                    your product does, key benefits, and unique selling points.
                    This appears in every AI prompt.
                  </InfoTip>
                </Label>
                <Textarea
                  id="productDescription"
                  rows={6}
                  placeholder="Describe your product, its features, benefits, and what makes it unique..."
                  value={formData.productDescription}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      productDescription: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audience Tab */}
        <TabsContent value="audience" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="space-y-1.5">
                <CardTitle className="flex items-center">
                  Target Personas
                  <InfoTip>
                    Personas inform script content. Pain points become hooks,
                    desires become benefits, and objections get addressed. When
                    generating, you can target all personas or select specific
                    ones.
                  </InfoTip>
                </CardTitle>
                <CardDescription>
                  Define your target audience segments for more personalized
                  scripts.
                </CardDescription>
              </div>
              <Dialog
                open={personaDialogOpen}
                onOpenChange={setPersonaDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Persona
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Persona</DialogTitle>
                    <DialogDescription>
                      Define a target audience persona for your scripts
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="personaName">Name</Label>
                      <Input
                        id="personaName"
                        placeholder="e.g., Busy Professional Mom"
                        value={newPersona.name}
                        onChange={(e) =>
                          setNewPersona({ ...newPersona, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="personaDescription">Description</Label>
                      <Textarea
                        id="personaDescription"
                        rows={2}
                        placeholder="Brief description of this persona..."
                        value={newPersona.description}
                        onChange={(e) =>
                          setNewPersona({
                            ...newPersona,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="demographics">
                        Demographics (optional)
                      </Label>
                      <Input
                        id="demographics"
                        placeholder="e.g., Women 25-40, urban, $60-100k income"
                        value={newPersona.demographics}
                        onChange={(e) =>
                          setNewPersona({
                            ...newPersona,
                            demographics: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="painPoints">
                        Pain Points (one per line)
                      </Label>
                      <Textarea
                        id="painPoints"
                        rows={3}
                        placeholder="Not enough time&#10;Too tired after work&#10;Current solutions don't work"
                        value={newPersona.painPoints}
                        onChange={(e) =>
                          setNewPersona({
                            ...newPersona,
                            painPoints: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="desires">Desires (one per line)</Label>
                      <Textarea
                        id="desires"
                        rows={3}
                        placeholder="Quick results&#10;Easy to use&#10;Affordable solution"
                        value={newPersona.desires}
                        onChange={(e) =>
                          setNewPersona({
                            ...newPersona,
                            desires: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="objections">
                        Objections (one per line)
                      </Label>
                      <Textarea
                        id="objections"
                        rows={3}
                        placeholder="Too expensive&#10;Won't work for me&#10;I've tried similar products"
                        value={newPersona.objections}
                        onChange={(e) =>
                          setNewPersona({
                            ...newPersona,
                            objections: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setPersonaDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreatePersona}>
                      Create Persona
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {project.personas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary mb-4">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-4">
                    No personas yet. Add a persona to define your target
                    audience.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setPersonaDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add your first persona
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {project.personas.map((persona) => (
                    <Card
                      key={persona.id}
                      className="bg-secondary/30 border-border/50"
                    >
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-foreground">
                              {persona.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {persona.description}
                            </p>
                            {persona.demographics && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {persona.demographics}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeletePersona(persona.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-3 text-sm">
                          {persona.painPoints.length > 0 && (
                            <div>
                              <p className="font-medium text-foreground mb-1">
                                Pain Points
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {persona.painPoints.slice(0, 3).map((p, i) => (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {p}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {persona.desires.length > 0 && (
                            <div>
                              <p className="font-medium text-foreground mb-1">
                                Desires
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {persona.desires.slice(0, 3).map((d, i) => (
                                  <Badge
                                    key={i}
                                    variant="success"
                                    className="text-xs"
                                  >
                                    {d}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Brand Tab */}
        <TabsContent value="brand" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Voice & Restrictions</CardTitle>
              <CardDescription>
                Define your brand&apos;s tone and any phrases or claims to
                avoid.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="brandVoice" className="flex items-center">
                  Brand Voice Guidelines
                  <InfoTip>
                    Defines tone and style for all scripts. Examples:
                    &quot;Friendly and casual&quot;, &quot;Professional but not
                    stuffy&quot;, &quot;Uses humor&quot;. The AI matches this
                    voice.
                  </InfoTip>
                </Label>
                <Textarea
                  id="brandVoice"
                  rows={4}
                  placeholder="Describe your brand's tone and style. e.g., Friendly and approachable, professional but not stuffy, uses humor..."
                  value={formData.brandVoice}
                  onChange={(e) =>
                    setFormData({ ...formData, brandVoice: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="forbiddenClaims" className="flex items-center">
                  Forbidden Claims/Phrases (one per line)
                  <InfoTip>
                    Words or phrases the AI must never use. Scripts containing
                    these are automatically flagged. Use for compliance (e.g.,
                    &quot;cures&quot;, &quot;guaranteed&quot;).
                  </InfoTip>
                </Label>
                <Textarea
                  id="forbiddenClaims"
                  rows={4}
                  placeholder="cure&#10;guaranteed results&#10;#1 in the world&#10;doctor recommended"
                  value={formData.forbiddenClaims}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      forbiddenClaims: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Language & Region</CardTitle>
              <CardDescription>
                Configure language and regional settings for your scripts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Input
                    id="language"
                    placeholder="en"
                    value={formData.language}
                    onChange={(e) =>
                      setFormData({ ...formData, language: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Region (optional)</Label>
                  <Input
                    id="region"
                    placeholder="e.g., US, UK, AU"
                    value={formData.region}
                    onChange={(e) =>
                      setFormData({ ...formData, region: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scripts Tab */}
        <TabsContent value="scripts" className="space-y-6">
          {/* Generation Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Generate Scripts
              </CardTitle>
              <CardDescription>
                Configure your script generation preferences and generate new
                scripts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center">
                    Script Angles
                    <InfoTip>
                      Different storytelling approaches. Each angle produces
                      scripts with distinct hook styles and narrative
                      structures. Select multiple for variety.
                    </InfoTip>
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {genSettings.angles.length} selected
                  </span>
                </div>
                <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                  {SCRIPT_ANGLES.map((angle) => (
                    <button
                      key={angle.value}
                      type="button"
                      onClick={() => toggleAngle(angle.value)}
                      className={`p-3 rounded-xl text-left transition-all duration-200 border ${
                        genSettings.angles.includes(angle.value)
                          ? "bg-primary/15 border-primary/30 text-primary"
                          : "bg-secondary/30 border-border hover:bg-secondary/60"
                      }`}
                    >
                      <p className="font-medium text-sm">{angle.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {angle.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Personas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Target Personas
                    {project.personas.length > 0 && (
                      <InfoTip>
                        Choose which audiences to target. &quot;All&quot; uses
                        every persona as context. Selecting specific personas
                        focuses scripts on those pain points and desires.
                      </InfoTip>
                    )}
                  </Label>
                  {project.personas.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {genSettings.personaIds.length === 0
                        ? "All personas"
                        : `${genSettings.personaIds.length} selected`}
                    </span>
                  )}
                </div>
                {project.personas.length === 0 ? (
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border text-center">
                    <p className="text-sm text-muted-foreground">
                      No personas defined. Add personas in the Audience tab for
                      targeted scripts.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => togglePersona("all")}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                        genSettings.personaIds.length === 0
                          ? "bg-primary/15 border-primary/30 text-primary"
                          : "bg-secondary/30 border-border hover:bg-secondary/60"
                      }`}
                    >
                      All Personas
                    </button>
                    {project.personas.map((persona) => (
                      <button
                        key={persona.id}
                        type="button"
                        onClick={() => togglePersona(persona.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                          genSettings.personaIds.includes(persona.id)
                            ? "bg-primary/15 border-primary/30 text-primary"
                            : "bg-secondary/30 border-border hover:bg-secondary/60"
                        }`}
                      >
                        {persona.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Scripts per Angle</Label>
                  <Input
                    type="number"
                    min={1}
                    max={25}
                    value={genSettings.scriptsPerAngle}
                    onChange={(e) =>
                      setGenSettings({
                        ...genSettings,
                        scriptsPerAngle: parseInt(e.target.value) || 1,
                      })
                    }
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">
                    Total: {totalScripts} scripts ({genSettings.angles.length}{" "}
                    angles × {genSettings.scriptsPerAngle})
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center">
                    Platform
                    <InfoTip>
                      Affects script pacing, hook style, and tone. TikTok is
                      fast/raw, Reels is polished, Shorts is educational.
                      Universal works across all platforms.
                    </InfoTip>
                  </Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {["universal", "tiktok", "reels", "shorts"].map(
                      (platform) => (
                        <Button
                          key={platform}
                          type="button"
                          variant={
                            genSettings.platform === platform
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() =>
                            setGenSettings({ ...genSettings, platform })
                          }
                          className="capitalize h-9"
                        >
                          {platform}
                        </Button>
                      ),
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center">
                    Durations
                    <InfoTip>
                      Target video lengths. Shorter = punchier hooks and faster
                      cuts. Longer = more storytelling. Select multiple for
                      variety.
                    </InfoTip>
                  </Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {DURATIONS.map((d) => (
                      <Button
                        key={d.value}
                        type="button"
                        variant={
                          genSettings.durations.includes(d.value)
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => toggleDuration(d.value)}
                        className="h-9"
                      >
                        {d.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quality */}
              <div className="space-y-2">
                <Label className="flex items-center">
                  Quality
                  <InfoTip>
                    Premium (5 credits) uses more expensive models for better
                    hooks and dialogue.
                  </InfoTip>
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={
                      genSettings.quality === "standard" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setGenSettings((s) => ({ ...s, quality: "standard" }))
                    }
                    className="h-9"
                  >
                    Standard
                    <CreditsCost amount={1} className="ml-1.5" />
                  </Button>
                  <Button
                    type="button"
                    variant={
                      genSettings.quality === "premium" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setGenSettings((s) => ({ ...s, quality: "premium" }))
                    }
                    className="h-9"
                  >
                    Premium
                    <CreditsCost amount={5} className="ml-1.5" />
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={
                  isGenerating ||
                  isBatchGenerating ||
                  genSettings.angles.length === 0
                }
                className="w-full h-12 text-base gap-2"
                variant="glow"
              >
                {isGenerating || isBatchGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating... ({selectedBatch?.progress || 0}%)
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Generate {totalScripts} Scripts
                    <CreditsCost amount={totalCredits} className="ml-1" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Batch Status - Processing */}
          {selectedBatch && isBatchGenerating && (
            <Card className="border-primary/30 bg-primary/5 overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-primary/15">
                      <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                      <div className="absolute inset-0 rounded-xl bg-primary/20 animate-ping" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        Generating scripts...
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedBatch.completedCount || 0} of{" "}
                        {selectedBatch.requestedCount} scripts completed
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-primary">
                      {selectedBatch.progress || 0}%
                    </span>
                  </div>
                </div>
                <Progress
                  value={selectedBatch.progress || 0}
                  variant="default"
                  className="h-3"
                />
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-primary/10">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      {selectedBatch.platform}
                    </span>
                    <span>{selectedBatch.angles.length} angles</span>
                    <span>
                      {selectedBatch.durations.map((d) => `${d}s`).join(", ")}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Please wait, this may take a moment
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Batch History */}
          {batchesList.length > 0 && (
            <Card>
              <CardContent className="pt-5">
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">Batch History</span>
                  </div>
                  <Select
                    value={selectedBatchId || ""}
                    onValueChange={handleSelectBatch}
                  >
                    <SelectTrigger className="w-[400px]">
                      <SelectValue placeholder="Select a batch" />
                    </SelectTrigger>
                    <SelectContent>
                      {batchesList.map((batch, index) => (
                        <SelectItem key={batch.id} value={batch.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {index === 0
                                ? "Latest"
                                : `Batch ${batchesList.length - index}`}
                            </span>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-muted-foreground text-xs">
                              {formatBatchDate(batch.createdAt)}
                            </span>
                            {(batch.status === "pending" ||
                              batch.status === "processing") && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0"
                              >
                                Generating
                              </Badge>
                            )}
                            {batch.status === "completed" && (
                              <>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  {batch._count?.scripts ||
                                    batch.scriptsCount ||
                                    batch.requestedCount}{" "}
                                  scripts
                                </Badge>
                                {batch.quality === "premium" && (
                                  <Badge
                                    variant="warning"
                                    className="text-[10px] px-1.5 py-0 gap-0.5"
                                  >
                                    Premium
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">
                    {batchesList.length}{" "}
                    {batchesList.length === 1 ? "batch" : "batches"} total
                  </span>
                </div>

                {/* Selected Batch Parameters */}
                {selectedBatch && (
                  <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      Parameters:
                    </span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {selectedBatch.platform}
                    </Badge>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {selectedBatch.durations.map((d) => `${d}s`).join(", ")}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {selectedBatch.angles.length}{" "}
                      {selectedBatch.angles.length === 1 ? "angle" : "angles"}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <Badge
                      variant={
                        selectedBatch.quality === "premium"
                          ? "warning"
                          : "secondary"
                      }
                      className="text-[10px] capitalize gap-1"
                    >
                      {selectedBatch.quality || "standard"}
                    </Badge>
                    <div className="flex flex-wrap gap-1 ml-auto">
                      {selectedBatch.angles.map((angle) => (
                        <Badge
                          key={angle}
                          variant="secondary"
                          className="text-[10px] capitalize"
                        >
                          {angle.replace("_", " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {scriptsList.length > 0 && (
            <>
              {/* Results Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Generated Scripts
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {filteredScripts.length} of {scriptsList.length} scripts
                  </p>
                </div>
                {selectedBatch && selectedBatch.status === "completed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    disabled={isExporting}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {isExporting ? "Exporting..." : "Export"}
                  </Button>
                )}
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                  <Filter className="h-4 w-4" />
                  <span className="text-sm font-medium">Filters</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <Select value={filterAngle} onValueChange={setFilterAngle}>
                    <SelectTrigger className="w-36 h-9">
                      <SelectValue placeholder="All angles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All angles</SelectItem>
                      {[...new Set(scriptsList.map((s) => s.angle))].map(
                        (angle) => {
                          const angleInfo = SCRIPT_ANGLES.find(
                            (a) => a.value === angle,
                          );
                          return (
                            <SelectItem key={angle} value={angle}>
                              {angleInfo?.label || angle?.replace("_", " ")}
                            </SelectItem>
                          );
                        },
                      )}
                    </SelectContent>
                  </Select>
                  {/* <Select
                    value={filterDuration}
                    onValueChange={setFilterDuration}
                  >
                    <SelectTrigger className="w-28 h-9">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All durations</SelectItem>
                      {DURATIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value.toString()}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select> */}
                  {/* <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Min score</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={filterMinScore}
                      onChange={(e) =>
                        setFilterMinScore(parseInt(e.target.value) || 0)
                      }
                      className="w-16 h-9"
                    />
                  </div> */}
                </div>
              </div>

              {/* Scripts List - Grouped by parent */}
              <div className="space-y-4">
                {(() => {
                  // Group scripts: originals (no parent) with their versions
                  const originals = filteredScripts.filter(s => !s.parentScriptId);
                  const versionsByParent = filteredScripts.reduce((acc, s) => {
                    if (s.parentScriptId) {
                      if (!acc[s.parentScriptId]) acc[s.parentScriptId] = [];
                      acc[s.parentScriptId].push(s);
                    }
                    return acc;
                  }, {} as Record<string, typeof filteredScripts>);

                  return originals.map((script, i) => {
                    // Sort versions by creation date (oldest first) so version numbers are correct
                    const versions = (versionsByParent[script.id] || [])
                      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                    const hasVersions = versions.length > 0;

                    return (
                      <div key={script.id} className="space-y-2">
                        {/* Original Script Card */}
                        <ScriptCard
                          script={script}
                          index={i}
                          isExpanded={expandedScript === script.id}
                          onToggleExpand={() => setExpandedScript(expandedScript === script.id ? null : script.id)}
                          onRegenerate={() => {
                            setRegenerateScriptId(script.id);
                            setRegenerateDialogOpen(true);
                          }}
                          getScoreVariant={getScoreVariant}
                          versionCount={versions.length}
                          isAdmin={isAdmin}
                        />

                        {/* Child Versions */}
                        {hasVersions && (
                          <div className="ml-6 pl-4 border-l-2 border-border space-y-2">
                            {versions.map((version, vi) => (
                              <ScriptCard
                                key={version.id}
                                script={version}
                                index={i + vi + 1}
                                isExpanded={expandedScript === version.id}
                                onToggleExpand={() => setExpandedScript(expandedScript === version.id ? null : version.id)}
                                onRegenerate={() => {
                                  setRegenerateScriptId(version.id);
                                  setRegenerateDialogOpen(true);
                                }}
                                getScoreVariant={getScoreVariant}
                                isVersion
                                versionNumber={vi + 2}
                                isAdmin={isAdmin}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </>
          )}

          {/* Empty State */}
          {batchesList.length === 0 && (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 mb-5">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No scripts yet
                </h3>
                <p className="text-muted-foreground max-w-sm">
                  Configure your settings above and generate your first batch of
                  UGC scripts
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Regenerate Dialog */}
      <Dialog
        open={regenerateDialogOpen}
        onOpenChange={setRegenerateDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Regenerate Script</DialogTitle>
            <DialogDescription>
              Provide instructions for how to modify this script
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex flex-wrap gap-2">
              {[
                "Make it shorter",
                "More aggressive",
                "More premium",
                "More direct",
                "Add urgency",
              ].map((preset) => (
                <Button
                  key={preset}
                  variant={
                    regenerateInstruction === preset ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setRegenerateInstruction(preset)}
                >
                  {preset}
                </Button>
              ))}
            </div>
            <Input
              placeholder="Or enter custom instructions..."
              value={regenerateInstruction}
              onChange={(e) => setRegenerateInstruction(e.target.value)}
            />
            {/* Cost indicator */}
            {selectedBatch && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                <span className="text-sm text-muted-foreground">Regeneration cost</span>
                <CreditsCost amount={selectedBatch.quality === "premium" ? 5 : 1} />
              </div>
            )}
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
                    Starting...
                  </>
                ) : (
                  <>
                    Regenerate
                    <CreditsCost amount={selectedBatch?.quality === "premium" ? 5 : 1} className="ml-1.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
