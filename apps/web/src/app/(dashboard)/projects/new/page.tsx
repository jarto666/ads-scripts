'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Link2,
  Sparkles,
  Crown,
  Check,
  Loader2,
  Plus,
  X,
  Target,
  Megaphone,
  Users,
  ClipboardCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { PersonaDialog } from '@/components/persona-dialog';
import { PersonaCard } from '@/components/persona-card';
import { useAuth } from '@/lib/auth';
import {
  useProjectDraftsControllerGetDraft,
  useProjectDraftsControllerCreateDraft,
  useProjectDraftsControllerUpdateDraft,
  useProjectDraftsControllerDeleteDraft,
  useProjectDraftsControllerImportFromUrl,
  useProjectDraftsControllerFinalizeDraft,
  getProjectDraftsControllerGetDraftQueryKey,
  getProjectsControllerFindAllQueryKey,
} from '@/api/generated/api';
import type { PersonaSuggestionDto, DraftFormDataDto } from '@/api/generated/models';

const STEPS = [
  { id: 0, label: 'Method', icon: Target },
  { id: 1, label: 'Product', icon: FileText },
  { id: 2, label: 'Brand', icon: Megaphone },
  { id: 3, label: 'Audience', icon: Users },
  { id: 4, label: 'Review', icon: ClipboardCheck },
];

interface FormData {
  name: string;
  productDescription: string;
  offer: string;
  brandVoice: string;
  forbiddenClaims: string[];
  language: string;
  region: string;
  suggestedPersonas: PersonaSuggestionDto[];
  selectedPersonaIds: string[];
}

const initialFormData: FormData = {
  name: '',
  productDescription: '',
  offer: '',
  brandVoice: '',
  forbiddenClaims: [],
  language: 'en',
  region: '',
  suggestedPersonas: [],
  selectedPersonaIds: [],
};

export default function NewProjectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const isPro = user?.plan === 'pro';

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [importMethod, setImportMethod] = useState<'scratch' | 'url' | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // API hooks
  const { data: draftData, isLoading: isDraftLoading } = useProjectDraftsControllerGetDraft({
    query: {
      // Poll every 2 seconds while importing
      refetchInterval: (query) => {
        const draft = query.state.data?.data;
        if (draft?.importStatus === 'importing') {
          return 2000;
        }
        return false;
      },
    },
  });
  const createDraftMutation = useProjectDraftsControllerCreateDraft();
  const updateDraftMutation = useProjectDraftsControllerUpdateDraft();
  const deleteDraftMutation = useProjectDraftsControllerDeleteDraft();
  const importUrlMutation = useProjectDraftsControllerImportFromUrl();
  const finalizeMutation = useProjectDraftsControllerFinalizeDraft();

  const draft = draftData?.data;
  const importStatus = draft?.importStatus as 'pending' | 'importing' | 'completed' | 'failed' | undefined;
  const importError = draft?.importError;

  // Initialize from existing draft
  useEffect(() => {
    if (isDraftLoading) return;
    if (isInitialized) return;

    // If there's an existing draft with valid data, restore it
    if (draft && draft.id) {
      const method = (draft.importMethod as 'scratch' | 'url') || null;

      // If importing, stay on step 0 to show progress
      if (importStatus === 'importing' || importStatus === 'pending') {
        setCurrentStep(0);
        setCompletedSteps([]);
        setImportMethod(method);
        setImportUrl(draft.sourceUrl || '');
      } else if (importStatus === 'failed') {
        // Failed import - stay on step 0 to show error and retry option
        setCurrentStep(0);
        setCompletedSteps([]);
        setImportMethod(method);
        setImportUrl(draft.sourceUrl || '');
      } else {
        // Completed or scratch - go to appropriate step
        const step = method && (draft.currentStep ?? 0) === 0 ? 1 : (draft.currentStep ?? 0);
        setCurrentStep(step);
        setCompletedSteps(draft.completedSteps || (method ? [0] : []));
        setImportMethod(method);
      }

      const fd = draft.formData as DraftFormDataDto;
      if (fd) {
        setFormData({
          name: fd.name || '',
          productDescription: fd.productDescription || '',
          offer: fd.offer || '',
          brandVoice: fd.brandVoice || '',
          forbiddenClaims: fd.forbiddenClaims || [],
          language: fd.language || 'en',
          region: fd.region || '',
          suggestedPersonas: fd.suggestedPersonas || [],
          selectedPersonaIds: fd.selectedPersonaIds || [],
        });
      }
    } else {
      // No draft - start fresh at step 0
      setCurrentStep(0);
      setCompletedSteps([]);
      setImportMethod(null);
      setFormData(initialFormData);
    }

    setIsInitialized(true);
  }, [draft, isDraftLoading, isInitialized, importStatus]);

  // When import completes, update local state (only reacts to importStatus change, not navigation)
  useEffect(() => {
    if (!draft || !isInitialized) return;
    if (importStatus !== 'completed' || importMethod !== 'url') return;

    // Only proceed if we were importing (currentStep would be 0 during import)
    // This prevents re-triggering when user navigates back to step 0
    if (currentStep !== 0) return;

    // Import just completed - update local state from draft
    setCurrentStep(draft.currentStep ?? 1);
    setCompletedSteps(draft.completedSteps || [0]);

    const fd = draft.formData as DraftFormDataDto;
    if (fd) {
      setFormData({
        name: fd.name || '',
        productDescription: fd.productDescription || '',
        offer: fd.offer || '',
        brandVoice: fd.brandVoice || '',
        forbiddenClaims: fd.forbiddenClaims || [],
        language: fd.language || 'en',
        region: fd.region || '',
        suggestedPersonas: fd.suggestedPersonas || [],
        selectedPersonaIds: fd.selectedPersonaIds || [],
      });
    }

    toast({
      title: 'Import successful',
      description: 'Product information has been extracted.',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importStatus]);

  // Save draft on changes (debounced)
  const saveDraft = useCallback(async () => {
    if (!importMethod) return;
    // Don't save while importing
    if (importStatus === 'importing') return;

    try {
      await updateDraftMutation.mutateAsync({
        data: {
          currentStep,
          completedSteps,
          formData: formData as unknown as Record<string, unknown>,
        },
      });
    } catch {
      // Silent fail for auto-save
    }
  }, [currentStep, completedSteps, formData, importMethod, importStatus, updateDraftMutation]);

  // Auto-save when form changes
  useEffect(() => {
    if (!isInitialized || !importMethod) return;
    if (importStatus === 'importing') return;

    const timeout = setTimeout(() => {
      saveDraft();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [formData, currentStep, completedSteps, isInitialized, importMethod, importStatus, saveDraft]);

  const handleMethodSelect = async (method: 'scratch' | 'url') => {
    if (method === 'url' && !isPro) {
      toast({
        title: 'Pro feature',
        description: 'URL import is available for Pro users only.',
        variant: 'destructive',
      });
      return;
    }

    // If there's an existing draft (user went back to step 0), delete it first
    if (draft) {
      try {
        await deleteDraftMutation.mutateAsync();
      } catch {
        // Continue anyway - create will handle it
      }
    }

    // Reset local state
    setFormData(initialFormData);
    setCompletedSteps([]);

    if (method === 'url') {
      // Create draft with url method but stay on step 0 for URL input
      try {
        await createDraftMutation.mutateAsync({
          data: { importMethod: 'url' },
        });
        setImportMethod('url');
        setImportUrl('');
        queryClient.invalidateQueries({ queryKey: getProjectDraftsControllerGetDraftQueryKey() });
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to start project',
          variant: 'destructive',
        });
      }
      return;
    }

    // Start from scratch
    try {
      await createDraftMutation.mutateAsync({
        data: { importMethod: 'scratch' },
      });
      setImportMethod('scratch');
      setCompletedSteps([0]);
      setCurrentStep(1);
      queryClient.invalidateQueries({ queryKey: getProjectDraftsControllerGetDraftQueryKey() });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to start project',
        variant: 'destructive',
      });
    }
  };

  const handleUrlImport = async () => {
    if (!importUrl.trim()) {
      toast({
        title: 'Enter a URL',
        description: 'Please enter a valid product URL',
        variant: 'destructive',
      });
      return;
    }

    try {
      // This starts the async import - the draft will be updated via polling
      await importUrlMutation.mutateAsync({
        data: { url: importUrl },
      });
      queryClient.invalidateQueries({ queryKey: getProjectDraftsControllerGetDraftQueryKey() });
    } catch {
      toast({
        title: 'Import failed',
        description: 'Failed to start import',
        variant: 'destructive',
      });
    }
  };

  const handleRetryImport = async () => {
    // Clear error and retry
    await handleUrlImport();
  };

  const handleSwitchToScratch = async () => {
    // Delete current draft and start fresh with scratch method
    try {
      await deleteDraftMutation.mutateAsync();
      setImportMethod(null);
      setImportUrl('');
      setFormData(initialFormData);
      setCurrentStep(0);
      setCompletedSteps([]);
      queryClient.invalidateQueries({ queryKey: getProjectDraftsControllerGetDraftQueryKey() });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to reset',
        variant: 'destructive',
      });
    }
  };

  const handleNext = () => {
    // Validate current step
    if (currentStep === 1) {
      if (!formData.name.trim() || !formData.productDescription.trim()) {
        toast({
          title: 'Required fields',
          description: 'Please fill in the project name and product description',
          variant: 'destructive',
        });
        return;
      }
    }

    const newCompleted = [...new Set([...completedSteps, currentStep])];
    setCompletedSteps(newCompleted);
    setCurrentStep(Math.min(currentStep + 1, 4));
  };

  const handleBack = () => {
    if (currentStep === 0) {
      router.push('/projects');
      return;
    }
    setCurrentStep(Math.max(currentStep - 1, 0));
  };

  const handleStepClick = (stepId: number) => {
    // Can only go to completed steps or current step
    if (completedSteps.includes(stepId) || stepId <= currentStep) {
      setCurrentStep(stepId);
    }
  };

  const handleFinalize = async () => {
    if (!formData.name.trim() || !formData.productDescription.trim()) {
      toast({
        title: 'Required fields',
        description: 'Project name and description are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await finalizeMutation.mutateAsync({
        data: {
          selectedPersonaIds: formData.selectedPersonaIds,
        },
      });

      toast({
        title: 'Project created!',
      });

      queryClient.invalidateQueries({ queryKey: getProjectsControllerFindAllQueryKey() });
      queryClient.invalidateQueries({ queryKey: getProjectDraftsControllerGetDraftQueryKey() });
      router.push(`/projects/${result.data.projectId}`);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to create project',
        variant: 'destructive',
      });
    }
  };

  const handleDiscardDraft = async () => {
    try {
      await deleteDraftMutation.mutateAsync();
      queryClient.invalidateQueries({ queryKey: getProjectDraftsControllerGetDraftQueryKey() });
      router.push('/projects');
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to discard draft',
        variant: 'destructive',
      });
    }
  };

  const addForbiddenClaim = (claim: string) => {
    if (claim.trim() && !formData.forbiddenClaims.includes(claim.trim())) {
      setFormData(prev => ({
        ...prev,
        forbiddenClaims: [...prev.forbiddenClaims, claim.trim()],
      }));
    }
  };

  const removeForbiddenClaim = (claim: string) => {
    setFormData(prev => ({
      ...prev,
      forbiddenClaims: prev.forbiddenClaims.filter(c => c !== claim),
    }));
  };

  if (isDraftLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Determine what to show on step 0 (all gated by currentStep === 0)
  const showUrlInput = currentStep === 0 && importMethod === 'url' && (importStatus === 'pending' || !importStatus);
  const showImporting = currentStep === 0 && importStatus === 'importing';
  const showImportError = currentStep === 0 && importStatus === 'failed';
  const showMethodSelection = currentStep === 0 && !showUrlInput && !showImporting && !showImportError;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">New Project</h1>
          <p className="text-muted-foreground mt-1">
            Set up your project to start generating UGC scripts
          </p>
        </div>
        {importMethod && (
          <Button variant="ghost" size="sm" onClick={handleDiscardDraft}>
            Discard draft
          </Button>
        )}
      </div>

      {/* Step Indicator */}
      <StepIndicator
        steps={STEPS}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      {/* Step Content */}
      <div className="min-h-[400px]">
        {/* Show method selection when no import method chosen yet */}
        {showMethodSelection && (
          <StepMethod
            isPro={isPro}
            isLoading={createDraftMutation.isPending}
            onSelect={handleMethodSelect}
          />
        )}

        {/* Show URL input form */}
        {showUrlInput && (
          <StepUrlInput
            url={importUrl}
            onUrlChange={setImportUrl}
            onSubmit={handleUrlImport}
            onBack={handleSwitchToScratch}
            isLoading={importUrlMutation.isPending}
          />
        )}

        {/* Show importing progress */}
        {showImporting && (
          <StepImporting url={draft?.sourceUrl || importUrl} />
        )}

        {/* Show import error */}
        {showImportError && (
          <StepImportError
            error={importError || 'Unknown error'}
            url={draft?.sourceUrl || importUrl}
            onRetry={handleRetryImport}
            onSwitchToScratch={handleSwitchToScratch}
            isRetrying={importUrlMutation.isPending}
          />
        )}

        {currentStep === 1 && (
          <StepBasicInfo
            formData={formData}
            onChange={setFormData}
          />
        )}

        {currentStep === 2 && (
          <StepBrand
            formData={formData}
            onChange={setFormData}
            onAddClaim={addForbiddenClaim}
            onRemoveClaim={removeForbiddenClaim}
          />
        )}

        {currentStep === 3 && (
          <StepPersonas
            formData={formData}
            onChange={setFormData}
          />
        )}

        {currentStep === 4 && (
          <StepReview
            formData={formData}
            importMethod={importMethod}
          />
        )}
      </div>

      {/* Navigation */}
      {currentStep > 0 && (
        <div className="flex items-center justify-between pt-6 border-t border-border">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep < 4 ? (
            <Button onClick={handleNext}>
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleFinalize}
              disabled={finalizeMutation.isPending}
              variant="glow"
            >
              {finalizeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create Project
                  <Sparkles className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Step Indicator Component
function StepIndicator({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
}: {
  steps: typeof STEPS;
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="relative">
      {/* Progress line - behind steps */}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-border z-0" />
      <div
        className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500 z-0"
        style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
      />

      {/* Steps - above progress line */}
      <div className="relative flex justify-between z-10">
        {steps.map((step) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;
          const isClickable = isCompleted || step.id <= currentStep;
          const Icon = step.icon;

          return (
            <button
              key={step.id}
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={`
                flex flex-col items-center gap-2 transition-all
                ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}
              `}
            >
              <div
                className={`
                  w-10 h-10 rounded-xl flex items-center justify-center
                  transition-all duration-300 border-4 border-background
                  ${isCurrent
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                    : isCompleted
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                  }
                `}
              >
                {isCompleted && !isCurrent ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={`
                  text-xs font-medium transition-colors
                  ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}
                `}
              >
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Step 0: Method Selection
function StepMethod({
  isPro,
  isLoading,
  onSelect,
}: {
  isPro: boolean;
  isLoading: boolean;
  onSelect: (method: 'scratch' | 'url') => void;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card
        className="group cursor-pointer hover:border-primary/50 transition-all"
        onClick={() => !isLoading && onSelect('scratch')}
      >
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
              <FileText className="h-6 w-6" />
            </div>
          </div>
          <CardTitle className="text-xl mt-4">Start from scratch</CardTitle>
          <CardDescription>
            Manually enter your product details, brand voice, and target personas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              Full control over all details
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              Create custom personas
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              Define brand voice manually
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card
        className={`
          group relative transition-all
          ${isPro
            ? 'cursor-pointer hover:border-primary/50'
            : 'opacity-75'
          }
        `}
        onClick={() => isPro && !isLoading && onSelect('url')}
      >
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
              <Link2 className="h-6 w-6" />
            </div>
            {!isPro && (
              <Badge variant="secondary" className="gap-1">
                <Crown className="h-3 w-3" />
                Pro
              </Badge>
            )}
          </div>
          <CardTitle className="text-xl mt-4">Import from URL</CardTitle>
          <CardDescription>
            Paste a product page URL and let AI extract information automatically
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI-powered extraction
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Auto-generate personas
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Detect brand voice
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// Step 0b: URL Input
function StepUrlInput({
  url,
  onUrlChange,
  onSubmit,
  onBack,
  isLoading,
}: {
  url: string;
  onUrlChange: (url: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  isLoading: boolean;
}) {
  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
          <Link2 className="h-6 w-6" />
        </div>
        <CardTitle>Import from URL</CardTitle>
        <CardDescription>
          Enter your product page URL and we&apos;ll extract the information automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="url">Product URL</Label>
          <Input
            id="url"
            type="url"
            placeholder="https://yourstore.com/product"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSubmit();
              }
            }}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Works best with product pages, landing pages, or e-commerce listings
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isLoading || !url.trim()}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Analyze URL
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Step 0c: Importing Progress
function StepImporting({ url }: { url: string }) {
  return (
    <Card className="max-w-xl mx-auto">
      <CardContent className="py-12">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-primary-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Analyzing your product page...</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              We&apos;re extracting product information and generating persona suggestions. This may take a minute.
            </p>
          </div>
          <div className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full truncate max-w-full">
            {url}
          </div>
          <p className="text-xs text-muted-foreground">
            You can safely close this page - we&apos;ll save your progress.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Step 0d: Import Error
function StepImportError({
  error,
  url,
  onRetry,
  onSwitchToScratch,
  isRetrying,
}: {
  error: string;
  url: string;
  onRetry: () => void;
  onSwitchToScratch: () => void;
  isRetrying: boolean;
}) {
  return (
    <Card className="max-w-xl mx-auto border-destructive/50">
      <CardContent className="py-12">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Import failed</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {error}
            </p>
          </div>
          <div className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full truncate max-w-full">
            {url}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onSwitchToScratch}
              disabled={isRetrying}
            >
              Start from scratch
            </Button>
            <Button
              onClick={onRetry}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try again
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Step 1: Basic Info
function StepBasicInfo({
  formData,
  onChange,
}: {
  formData: FormData;
  onChange: (data: FormData) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Information</CardTitle>
        <CardDescription>
          Tell us about the product you want to create ad scripts for
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">
            Project Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder="e.g., Summer Skincare Launch"
            value={formData.name}
            onChange={(e) => onChange({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">
            Product Description <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="description"
            placeholder="Describe your product, its key features, benefits, and what makes it unique..."
            rows={6}
            value={formData.productDescription}
            onChange={(e) =>
              onChange({ ...formData, productDescription: e.target.value })
            }
          />
          <p className="text-xs text-muted-foreground">
            The more detail you provide, the better your scripts will be
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="offer">Current Offer (optional)</Label>
          <Input
            id="offer"
            placeholder="e.g., 20% off with code SUMMER20"
            value={formData.offer}
            onChange={(e) => onChange({ ...formData, offer: e.target.value })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Step 2: Brand
function StepBrand({
  formData,
  onChange,
  onAddClaim,
  onRemoveClaim,
}: {
  formData: FormData;
  onChange: (data: FormData) => void;
  onAddClaim: (claim: string) => void;
  onRemoveClaim: (claim: string) => void;
}) {
  const [newClaim, setNewClaim] = useState('');

  const handleAddClaim = () => {
    if (newClaim.trim()) {
      onAddClaim(newClaim);
      setNewClaim('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand Guidelines</CardTitle>
        <CardDescription>
          Help the AI understand your brand voice and any claims to avoid
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="brandVoice">Brand Voice (optional)</Label>
          <Textarea
            id="brandVoice"
            placeholder="Describe your brand's tone and personality. e.g., Friendly and approachable, uses casual language, empowers customers..."
            rows={4}
            value={formData.brandVoice}
            onChange={(e) =>
              onChange({ ...formData, brandVoice: e.target.value })
            }
          />
        </div>

        <div className="space-y-3">
          <Label>Forbidden Claims (optional)</Label>
          <p className="text-xs text-muted-foreground">
            Add any claims or phrases that should never appear in your scripts
          </p>

          <div className="flex gap-2">
            <Input
              placeholder="e.g., FDA approved, cures disease..."
              value={newClaim}
              onChange={(e) => setNewClaim(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddClaim();
                }
              }}
            />
            <Button variant="outline" onClick={handleAddClaim}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {formData.forbiddenClaims.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {formData.forbiddenClaims.map((claim) => (
                <Badge
                  key={claim}
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  {claim}
                  <button
                    onClick={() => onRemoveClaim(claim)}
                    className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Step 3: Personas
function StepPersonas({
  formData,
  onChange,
}: {
  formData: FormData;
  onChange: (data: FormData) => void;
}) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingPersona, setEditingPersona] = useState<PersonaSuggestionDto | null>(null);

  const handleSavePersona = async (personaData: {
    name: string;
    description: string;
    demographics: string;
    painPoints: string;
    desires: string;
    objections: string;
  }) => {
    if (editingPersona) {
      // Update existing persona
      const updatedPersona: PersonaSuggestionDto = {
        ...editingPersona,
        name: personaData.name,
        description: personaData.description,
        demographics: personaData.demographics || undefined,
        painPoints: personaData.painPoints.split('\n').map(s => s.trim()).filter(Boolean),
        desires: personaData.desires.split('\n').map(s => s.trim()).filter(Boolean),
        objections: personaData.objections.split('\n').map(s => s.trim()).filter(Boolean),
      };
      onChange({
        ...formData,
        suggestedPersonas: formData.suggestedPersonas.map(p =>
          p.id === editingPersona.id ? updatedPersona : p
        ),
      });
      setEditingPersona(null);
    } else {
      // Create new persona
      const persona: PersonaSuggestionDto = {
        id: `custom-${Date.now()}`,
        name: personaData.name,
        description: personaData.description,
        demographics: personaData.demographics || undefined,
        painPoints: personaData.painPoints.split('\n').map(s => s.trim()).filter(Boolean),
        desires: personaData.desires.split('\n').map(s => s.trim()).filter(Boolean),
        objections: personaData.objections.split('\n').map(s => s.trim()).filter(Boolean),
      };
      onChange({
        ...formData,
        suggestedPersonas: [...formData.suggestedPersonas, persona],
        selectedPersonaIds: [...formData.selectedPersonaIds, persona.id],
      });
    }
  };

  const handleEditPersona = (persona: PersonaSuggestionDto) => {
    setEditingPersona(persona);
    setShowAddDialog(true);
  };

  const handleDeletePersona = (id: string) => {
    onChange({
      ...formData,
      suggestedPersonas: formData.suggestedPersonas.filter(p => p.id !== id),
      selectedPersonaIds: formData.selectedPersonaIds.filter(pid => pid !== id),
    });
  };

  const handleDialogClose = (open: boolean) => {
    setShowAddDialog(open);
    if (!open) {
      setEditingPersona(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Target Audience</CardTitle>
              <CardDescription>
                Define your target audience segments for personalized scripts
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Persona
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {formData.suggestedPersonas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No personas yet. Add at least one persona to continue.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {formData.suggestedPersonas.map((persona) => (
                <PersonaCard
                  key={persona.id}
                  persona={persona}
                  onEdit={handleEditPersona}
                  onDelete={handleDeletePersona}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Persona Dialog */}
      <PersonaDialog
        open={showAddDialog}
        onOpenChange={handleDialogClose}
        onSave={handleSavePersona}
        editingPersona={editingPersona}
        projectId="draft"
        productContext={{
          name: formData.name,
          description: formData.productDescription,
        }}
      />
    </div>
  );
}

// Step 4: Review
function StepReview({
  formData,
  importMethod,
}: {
  formData: FormData;
  importMethod: 'scratch' | 'url' | null;
}) {
  const selectedPersonas = formData.suggestedPersonas.filter((p) =>
    formData.selectedPersonaIds.includes(p.id)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review Your Project</CardTitle>
          <CardDescription>
            Review the information before creating your project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-primary" />
              Product Information
            </div>
            <div className="grid gap-4 pl-6">
              <div>
                <p className="text-xs text-muted-foreground">Project Name</p>
                <p className="text-sm">{formData.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="text-sm line-clamp-3">
                  {formData.productDescription || '-'}
                </p>
              </div>
              {formData.offer && (
                <div>
                  <p className="text-xs text-muted-foreground">Offer</p>
                  <p className="text-sm">{formData.offer}</p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Megaphone className="h-4 w-4 text-primary" />
              Brand Guidelines
            </div>
            <div className="grid gap-4 pl-6">
              <div>
                <p className="text-xs text-muted-foreground">Brand Voice</p>
                <p className="text-sm">{formData.brandVoice || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Forbidden Claims</p>
                {formData.forbiddenClaims.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {formData.forbiddenClaims.map((claim) => (
                      <Badge key={claim} variant="outline" className="text-xs">
                        {claim}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">None specified</p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Personas */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4 text-primary" />
              Target Audience ({selectedPersonas.length} persona{selectedPersonas.length !== 1 ? 's' : ''})
            </div>
            <div className="grid gap-2 pl-6">
              {selectedPersonas.length > 0 ? (
                selectedPersonas.map((persona) => (
                  <div key={persona.id} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="text-sm">{persona.name}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No personas selected</p>
              )}
            </div>
          </div>

          {importMethod === 'url' && (
            <>
              <div className="border-t border-border" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                Imported with AI-powered extraction
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
