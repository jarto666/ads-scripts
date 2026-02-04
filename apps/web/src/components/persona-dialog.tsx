"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Loader2,
  ChevronDown,
  Crown,
  Plus,
  X,
  Frown,
  Heart,
  ShieldQuestion,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth";
import { personasControllerGenerate, personasControllerEnrichFields } from "@/api/generated/api";
import { cn } from "@/lib/utils";

export interface PersonaFormData {
  name: string;
  description: string;
  demographics: string;
  painPoints: string[];
  desires: string[];
  objections: string[];
}

interface PersonaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: PersonaFormData) => Promise<void>;
  editingPersona?: {
    id: string;
    name: string;
    description: string;
    demographics?: string | null;
    painPoints?: string[];
    desires?: string[];
    objections?: string[];
  } | null;
  projectId: string;
  productContext?: {
    name?: string;
    description?: string;
  };
}

const emptyFormData: PersonaFormData = {
  name: "",
  description: "",
  demographics: "",
  painPoints: [],
  desires: [],
  objections: [],
};

const RECOMMENDED = {
  painPoints: 4,
  desires: 4,
  objections: 3,
};

type EnrichableField = 'painPoints' | 'desires' | 'objections';

// Pill component - full text visible
function AttributePill({
  text,
  onRemove,
  variant
}: {
  text: string;
  onRemove: () => void;
  variant: 'pain' | 'desire' | 'objection';
}) {
  const variantStyles = {
    pain: 'bg-amber-500/10 text-amber-200 border-amber-500/20 hover:bg-amber-500/20',
    desire: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20',
    objection: 'bg-slate-500/10 text-slate-300 border-slate-500/20 hover:bg-slate-500/20',
  };

  return (
    <div
      className={cn(
        "group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs leading-snug transition-colors",
        variantStyles[variant]
      )}
    >
      <span>{text}</span>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function PersonaDialog({
  open,
  onOpenChange,
  onSave,
  editingPersona,
  projectId,
  productContext,
}: PersonaDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isPro = user?.plan === "pro";
  const [formData, setFormData] = useState<PersonaFormData>(emptyFormData);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
  const [aiAssistExpanded, setAiAssistExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [enrichingField, setEnrichingField] = useState<EnrichableField | 'all' | null>(null);
  const [activeTab, setActiveTab] = useState<EnrichableField>('painPoints');

  // Input states for list fields
  const [newPainPoint, setNewPainPoint] = useState("");
  const [newDesire, setNewDesire] = useState("");
  const [newObjection, setNewObjection] = useState("");

  const isEditing = !!editingPersona;
  const hasRequiredFields = formData.name.trim() && formData.description.trim();
  const canEnrich = isPro && hasRequiredFields;

  useEffect(() => {
    if (open && editingPersona) {
      setFormData({
        name: editingPersona.name,
        description: editingPersona.description,
        demographics: editingPersona.demographics || "",
        painPoints: editingPersona.painPoints || [],
        desires: editingPersona.desires || [],
        objections: editingPersona.objections || [],
      });
    } else if (open && !editingPersona) {
      setFormData(emptyFormData);
    }
  }, [open, editingPersona]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setFormData(emptyFormData);
      setAiPrompt("");
      setAiAssistExpanded(false);
      setNewPainPoint("");
      setNewDesire("");
      setNewObjection("");
      setActiveTab('painPoints');
    }
    onOpenChange(newOpen);
  };

  const handleGenerateWithAi = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Enter a description",
        description: "Please describe your target audience",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingPersona(true);
    try {
      const result = await personasControllerGenerate(projectId, {
        prompt: aiPrompt,
        productName: productContext?.name,
        productDescription: productContext?.description,
      });
      const suggestion = result.data;
      setFormData({
        name: suggestion.name || "",
        description: suggestion.description || "",
        demographics: suggestion.demographics || "",
        painPoints: suggestion.painPoints || [],
        desires: suggestion.desires || [],
        objections: suggestion.objections || [],
      });
      toast({ title: "Persona generated", description: "Review and edit the suggestion below" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to generate persona suggestion",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPersona(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.description) {
      toast({
        title: "Missing fields",
        description: "Name and description are required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      handleOpenChange(false);
    } catch {
      // Error handling done by parent
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnrichFields = async (fields: EnrichableField[]) => {
    if (!hasRequiredFields || !isPro) return;

    setEnrichingField(fields.length === 1 ? fields[0] : 'all');
    try {
      const result = await personasControllerEnrichFields(projectId, {
        name: formData.name,
        description: formData.description,
        demographics: formData.demographics || undefined,
        fields,
      });
      const enriched = result.data;

      setFormData(prev => ({
        ...prev,
        ...(enriched.painPoints && { painPoints: enriched.painPoints }),
        ...(enriched.desires && { desires: enriched.desires }),
        ...(enriched.objections && { objections: enriched.objections }),
      }));

      toast({
        title: "Fields enriched",
        description: `AI generated ${fields.join(', ')} for this persona`,
      });
    } catch {
      toast({
        title: "Enrichment failed",
        description: "Failed to generate field content",
        variant: "destructive",
      });
    } finally {
      setEnrichingField(null);
    }
  };

  const addToList = (
    field: EnrichableField,
    value: string,
    setValue: (v: string) => void
  ) => {
    const trimmed = value.trim();
    if (trimmed && !formData[field].includes(trimmed)) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], trimmed],
      }));
      setValue("");
    }
  };

  const removeFromList = (field: EnrichableField, item: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter(i => i !== item),
    }));
  };

  // Tab configuration
  const tabConfig = {
    painPoints: {
      label: 'Pain Points',
      icon: Frown,
      variant: 'pain' as const,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      newValue: newPainPoint,
      setNewValue: setNewPainPoint,
      placeholder: 'e.g., Frustrated with slow results',
      recommended: RECOMMENDED.painPoints,
    },
    desires: {
      label: 'Desires',
      icon: Heart,
      variant: 'desire' as const,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      newValue: newDesire,
      setNewValue: setNewDesire,
      placeholder: 'e.g., Wants quick, visible results',
      recommended: RECOMMENDED.desires,
    },
    objections: {
      label: 'Objections',
      icon: ShieldQuestion,
      variant: 'objection' as const,
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/10',
      newValue: newObjection,
      setNewValue: setNewObjection,
      placeholder: 'e.g., Worried about the price',
      recommended: RECOMMENDED.objections,
    },
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/50 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            {isEditing ? "Edit Persona" : "Create Persona"}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the persona details" : "Define a target audience persona for your scripts"}
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-5">
            {/* AI Assist */}
            <Collapsible
              open={isPro ? aiAssistExpanded : false}
              onOpenChange={isPro ? setAiAssistExpanded : undefined}
              className={cn(
                "rounded-xl border overflow-hidden transition-colors",
                isPro ? 'border-primary/20 bg-primary/5' : 'border-border bg-muted/30 opacity-60'
              )}
            >
              <CollapsibleTrigger
                className={cn(
                  "w-full flex items-center justify-between p-3 transition-colors",
                  isPro && !aiAssistExpanded && 'hover:bg-primary/10',
                  !isPro && 'cursor-not-allowed'
                )}
                disabled={!isPro}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className={cn("h-4 w-4", isPro ? 'text-primary' : 'text-muted-foreground')} />
                  <span className="text-sm font-medium">AI Assist</span>
                  {!isPro && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-500">
                      <Crown className="h-3 w-3" />
                      Pro
                    </span>
                  )}
                </div>
                {isPro && (
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    aiAssistExpanded && 'rotate-180'
                  )} />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 pb-3 space-y-3">
                  <Textarea
                    placeholder="Describe your target audience... e.g., 'Busy working moms aged 30-45 who struggle with meal prep'"
                    rows={2}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    disabled={isGeneratingPersona}
                    className="bg-background/50 text-sm resize-none"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateWithAi}
                    disabled={isGeneratingPersona || !aiPrompt.trim()}
                  >
                    {isGeneratingPersona ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {isGeneratingPersona ? 'Generating...' : 'Generate'}
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Profile Section */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="personaName" className="text-xs text-muted-foreground">Name</Label>
                <Input
                  id="personaName"
                  placeholder="e.g., Busy Professional Mom"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="demographics" className="text-xs text-muted-foreground">Demographics (optional)</Label>
                <Input
                  id="demographics"
                  placeholder="e.g., Women 25-40, urban, $60-100k income"
                  value={formData.demographics}
                  onChange={(e) => setFormData({ ...formData, demographics: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="personaDescription" className="text-xs text-muted-foreground">Description</Label>
                <Textarea
                  id="personaDescription"
                  rows={2}
                  placeholder="Brief description of this persona..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="resize-none text-sm"
                />
              </div>
            </div>

            {/* Attributes Section with Tabs */}
            <div className="space-y-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Attributes</span>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EnrichableField)} className="w-full">
                <TabsList className="w-full h-10 p-1 bg-secondary/30">
                  {(Object.keys(tabConfig) as EnrichableField[]).map((key) => {
                    const config = tabConfig[key];
                    const count = formData[key].length;
                    const Icon = config.icon;
                    return (
                      <TabsTrigger
                        key={key}
                        value={key}
                        className={cn(
                          "flex-1 gap-1.5 text-xs data-[state=active]:shadow-none",
                          activeTab === key && config.bgColor
                        )}
                      >
                        <Icon className={cn("h-3.5 w-3.5", activeTab === key && config.color)} />
                        <span>{config.label}</span>
                        <span className={cn(
                          "ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                          count >= config.recommended
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-secondary text-muted-foreground"
                        )}>
                          {count}
                        </span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {(Object.keys(tabConfig) as EnrichableField[]).map((key) => {
                  const config = tabConfig[key];
                  const items = formData[key];
                  const isEnriching = enrichingField === key;

                  return (
                    <TabsContent key={key} value={key} className="mt-3 space-y-3">
                      {/* Input row */}
                      <div className="flex gap-2">
                        <Input
                          placeholder={config.placeholder}
                          value={config.newValue}
                          onChange={(e) => config.setNewValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addToList(key, config.newValue, config.setNewValue);
                            }
                          }}
                          className="h-9 text-sm flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 px-3"
                          onClick={() => addToList(key, config.newValue, config.setNewValue)}
                          disabled={!config.newValue.trim()}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Pills - fixed height container */}
                      <div className="h-[140px] p-3 rounded-lg bg-secondary/20 border border-border/50 overflow-y-auto">
                        {items.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {items.map((item) => (
                              <AttributePill
                                key={item}
                                text={item}
                                variant={config.variant}
                                onRemove={() => removeFromList(key, item)}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                            No {config.label.toLowerCase()} added yet
                          </div>
                        )}
                      </div>

                      {/* Recommendation + AI fill */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {items.length < config.recommended
                            ? `Add ${config.recommended - items.length} more for best results`
                            : `${items.length} added`
                          }
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "h-7 px-2 text-xs",
                                    canEnrich
                                      ? "text-primary hover:text-primary hover:bg-primary/10"
                                      : "text-muted-foreground"
                                  )}
                                  onClick={() => handleEnrichFields([key])}
                                  disabled={!canEnrich || enrichingField !== null}
                                >
                                  {isEnriching ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                                  ) : !isPro ? (
                                    <Crown className="h-3 w-3 mr-1.5 text-amber-500" />
                                  ) : (
                                    <Sparkles className="h-3 w-3 mr-1.5" />
                                  )}
                                  Fill with AI
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!canEnrich && (
                              <TooltipContent>
                                {!isPro
                                  ? "Upgrade to Pro to use AI fill"
                                  : "Enter name and description first"
                                }
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/50 shrink-0 bg-secondary/20">
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              isEditing ? "Save Changes" : "Create Persona"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
