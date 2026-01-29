"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Loader2,
  ChevronDown,
  Crown,
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
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth";
import { personasControllerGenerate } from "@/api/generated/api";

interface PersonaFormData {
  name: string;
  description: string;
  demographics: string;
  painPoints: string;
  desires: string;
  objections: string;
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
  /** Project ID for AI generation, or "draft" for wizard mode */
  projectId: string;
  /** Optional product context for draft mode */
  productContext?: {
    name?: string;
    description?: string;
  };
}

const emptyFormData: PersonaFormData = {
  name: "",
  description: "",
  demographics: "",
  painPoints: "",
  desires: "",
  objections: "",
};

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

  const isEditing = !!editingPersona;

  // Pre-fill form when editingPersona changes
  useEffect(() => {
    if (open && editingPersona) {
      setFormData({
        name: editingPersona.name,
        description: editingPersona.description,
        demographics: editingPersona.demographics || "",
        painPoints: editingPersona.painPoints?.join("\n") || "",
        desires: editingPersona.desires?.join("\n") || "",
        objections: editingPersona.objections?.join("\n") || "",
      });
    } else if (open && !editingPersona) {
      setFormData(emptyFormData);
    }
  }, [open, editingPersona]);

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setFormData(emptyFormData);
      setAiPrompt("");
      setAiAssistExpanded(false);
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
        painPoints: suggestion.painPoints?.join("\n") || "",
        desires: suggestion.desires?.join("\n") || "",
        objections: suggestion.objections?.join("\n") || "",
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Fixed Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle>{isEditing ? "Edit Persona" : "Create Persona"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the persona details" : "Define a target audience persona for your scripts"}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* AI Assist Section */}
          <Collapsible
            open={isPro ? aiAssistExpanded : false}
            onOpenChange={isPro ? setAiAssistExpanded : undefined}
            className={`rounded-xl border overflow-hidden ${isPro ? 'border-primary/20 bg-primary/5' : 'border-border bg-muted/30 opacity-75'}`}
          >
            <CollapsibleTrigger
              className={`w-full flex items-center justify-between p-3 transition-colors ${isPro && !aiAssistExpanded ? 'hover:bg-primary/10' : ''} ${!isPro ? 'cursor-default' : ''}`}
              disabled={!isPro}
            >
              <div className="flex items-center gap-2">
                <Sparkles className={`h-4 w-4 shrink-0 ${isPro ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-sm font-medium">AI Assist</span>
                {!isPro && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-500">
                    <Crown className="h-3 w-3" />
                    Pro
                  </span>
                )}
                <span className="text-muted-foreground">·</span>
                <span className="text-sm text-muted-foreground">Generate a persona suggestion with AI</span>
              </div>
              {isPro && (
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${aiAssistExpanded ? 'rotate-180' : ''}`} />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
              <div className="px-3 pb-3 space-y-3">
                <Textarea
                  placeholder="Describe your target audience... e.g., 'Busy working moms aged 30-45 who care about healthy eating but struggle with meal prep time'"
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  disabled={isGeneratingPersona}
                  className="bg-background/50"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleGenerateWithAi}
                  disabled={isGeneratingPersona || !aiPrompt.trim()}
                >
                  {isGeneratingPersona ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Suggestion
                    </>
                  )}
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Form Fields */}
          <div className="space-y-2">
            <Label htmlFor="personaName">Name</Label>
            <Input
              id="personaName"
              placeholder="e.g., Busy Professional Mom"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="personaDescription">Description</Label>
            <Textarea
              id="personaDescription"
              rows={3}
              placeholder="Brief description of this persona..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="demographics">Demographics (optional)</Label>
            <Textarea
              id="demographics"
              rows={2}
              placeholder="e.g., Women 25-40, urban, $60-100k income"
              value={formData.demographics}
              onChange={(e) => setFormData({ ...formData, demographics: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="painPoints">Pain Points (one per line)</Label>
            <Textarea
              id="painPoints"
              rows={3}
              placeholder="Not enough time&#10;Too tired after work&#10;Current solutions don't work"
              value={formData.painPoints}
              onChange={(e) => setFormData({ ...formData, painPoints: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="desires">Desires (one per line)</Label>
            <Textarea
              id="desires"
              rows={3}
              placeholder="Quick results&#10;Easy to use&#10;Affordable solution"
              value={formData.desires}
              onChange={(e) => setFormData({ ...formData, desires: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="objections">Objections (one per line)</Label>
            <Textarea
              id="objections"
              rows={3}
              placeholder="Too expensive&#10;Won't work for me&#10;I've tried similar products"
              value={formData.objections}
              onChange={(e) => setFormData({ ...formData, objections: e.target.value })}
            />
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
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
