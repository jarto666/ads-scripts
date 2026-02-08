"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  X,
  Loader2,
  Search,
  FileUp,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { authControllerMe } from "@/api/generated/api";

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3232/api";

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PolicySummary {
  language: string;
  status: string;
  bannedPhrasesCount: number;
  clichePatternsCount: number;
  scoringWordsCount: number;
  groundednessPatternsCount: number;
  updatedAt: string;
}

interface PolicyDetail {
  language: string;
  status: string;
  wordLimits: Record<string, WordLimitConfig>;
  bannedPhrases: string[];
  bannedRegex: string[];
  softAvoid: string[];
  harshWords: string[];
  clicheHookOpeners: string[];
  clicheLlmSmell: string[];
  clicheGenericFiller: string[];
  clicheStructurePatterns: string[];
  hookPowerWords: string[];
  benefitWords: string[];
  visualActionWords: string[];
  ctaActionWords: string[];
  ctaUrgencyWords: string[];
  conversationalMarkers: string[];
  emotionalPatterns: string[];
  groundednessAbsolutePatterns: string[];
  groundednessScalePatterns: string[];
  groundednessPromoPatterns: string[];
  groundednessTimelinePatterns: string[];
  groundednessSocialProofPatterns: string[];
}

interface WordLimitConfig {
  max?: number;
  enforce?: boolean;
  scorePenalty?: number;
}

// ---------------------------------------------------------------------------
// ManagedList — searchable, scrollable list editor
// ---------------------------------------------------------------------------
function ManagedList({
  label,
  items,
  onChange,
  placeholder = "Add item...",
  mono = false,
  description,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  mono?: boolean;
  description?: string;
}) {
  const [search, setSearch] = useState("");
  const [newItem, setNewItem] = useState("");
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.localeCompare(b)),
    [items],
  );

  const filtered = useMemo(
    () =>
      search
        ? sorted.filter((item) =>
            item.toLowerCase().includes(search.toLowerCase()),
          )
        : sorted,
    [sorted, search],
  );

  const addItem = () => {
    const trimmed = newItem.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
      setNewItem("");
      inputRef.current?.focus();
    }
  };

  const removeItem = (item: string) => {
    onChange(items.filter((i) => i !== item));
  };

  const handleBulkAdd = () => {
    const newItems = bulkText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !items.includes(line));
    if (newItems.length > 0) {
      onChange([...items, ...newItems]);
    }
    setBulkText("");
    setShowBulkAdd(false);
  };

  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(sorted.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const bulkCount = bulkText
    .split("\n")
    .filter((line) => line.trim() && !items.includes(line.trim())).length;

  const textClass = mono ? "font-mono text-[11px]" : "text-xs";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0">
          <h4 className="text-sm font-medium text-foreground truncate">
            {label}
            <span className="ml-1.5 text-muted-foreground font-normal tabular-nums">
              ({items.length})
            </span>
          </h4>
          {description && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground"
            onClick={handleCopyAll}
            title="Copy all"
          >
            {copied ? (
              <Check className="h-3 w-3 text-success" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground gap-1"
            onClick={() => setShowBulkAdd(true)}
          >
            <FileUp className="h-3 w-3" />
            Bulk
          </Button>
        </div>
      </div>

      {/* Search — only show for lists larger than 8 */}
      {items.length > 8 && (
        <div className="relative mb-1.5">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Filter ${items.length} items...`}
            className="w-full h-7 pl-7 pr-3 rounded-md border border-border bg-input text-xs placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-ring/50 focus:border-primary/50 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Item list */}
      <div className="border border-border rounded-lg overflow-hidden bg-card/50">
        <div className="max-h-[240px] overflow-y-auto divide-y divide-border/40">
          {filtered.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              {search ? (
                <>
                  No matches for &ldquo;{search}&rdquo;
                </>
              ) : (
                "Empty — add items below"
              )}
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item}
                className="flex items-center justify-between px-3 py-[7px] hover:bg-secondary/30 group"
              >
                <span
                  className={`truncate pr-3 ${textClass} text-foreground/90`}
                  title={item}
                >
                  {item}
                </span>
                <button
                  onClick={() => removeItem(item)}
                  className="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/15 hover:text-destructive transition-all"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add input pinned at bottom */}
        <div className="flex items-center border-t border-border bg-secondary/10">
          <input
            ref={inputRef}
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addItem();
              }
            }}
            placeholder={placeholder}
            className={`flex-1 bg-transparent px-3 py-2 ${textClass} outline-none placeholder:text-muted-foreground/40`}
          />
          <button
            onClick={addItem}
            disabled={!newItem.trim()}
            className="px-2.5 py-2 text-muted-foreground hover:text-primary disabled:opacity-20 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {search && filtered.length < sorted.length && (
        <p className="text-[10px] text-muted-foreground mt-1">
          Showing {filtered.length} of {items.length}
        </p>
      )}

      {/* Bulk add dialog */}
      <Dialog open={showBulkAdd} onOpenChange={setShowBulkAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Add — {label}</DialogTitle>
            <DialogDescription>
              Paste items, one per line. Duplicates are automatically skipped.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={"item one\nitem two\nitem three"}
            className={`min-h-[220px] ${textClass}`}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setBulkText("");
                setShowBulkAdd(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkAdd} disabled={bulkCount === 0}>
              Add {bulkCount} item{bulkCount !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WordLimitsEditor — structured table for word limit config
// ---------------------------------------------------------------------------
function WordLimitsEditor({
  value,
  onChange,
}: {
  value: Record<string, WordLimitConfig>;
  onChange: (v: Record<string, WordLimitConfig>) => void;
}) {
  const [newWord, setNewWord] = useState("");

  const entries = Object.entries(value).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const updateEntry = (
    word: string,
    field: keyof WordLimitConfig,
    val: number | boolean,
  ) => {
    onChange({ ...value, [word]: { ...value[word], [field]: val } });
  };

  const removeEntry = (word: string) => {
    const next = { ...value };
    delete next[word];
    onChange(next);
  };

  const addEntry = () => {
    const trimmed = newWord.trim();
    if (trimmed && !value[trimmed]) {
      onChange({ ...value, [trimmed]: { max: 2, enforce: false, scorePenalty: 0 } });
      setNewWord("");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-foreground">
          Word Limits
          <span className="ml-1.5 text-muted-foreground font-normal tabular-nums">
            ({entries.length})
          </span>
        </h4>
      </div>
      <div className="border border-border rounded-lg overflow-hidden bg-card/50">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-secondary/20">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                Word / Key
              </th>
              <th className="text-center px-2 py-2 font-medium text-muted-foreground w-[60px]">
                Max
              </th>
              <th className="text-center px-2 py-2 font-medium text-muted-foreground w-[60px]">
                Enforce
              </th>
              <th className="text-center px-2 py-2 font-medium text-muted-foreground w-[68px]">
                Penalty
              </th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {entries.map(([word, config]) => (
              <tr
                key={word}
                className="hover:bg-secondary/20 group"
              >
                <td className="px-3 py-1.5 font-mono text-[11px] text-foreground/90">
                  {word}
                </td>
                <td className="px-2 py-1.5 text-center">
                  <input
                    type="number"
                    value={config.max ?? 0}
                    onChange={(e) =>
                      updateEntry(word, "max", parseInt(e.target.value) || 0)
                    }
                    className="w-11 bg-transparent border border-border rounded px-1 py-0.5 text-center text-xs tabular-nums focus:ring-1 focus:ring-ring/50 outline-none"
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <input
                    type="checkbox"
                    checked={config.enforce ?? false}
                    onChange={(e) =>
                      updateEntry(word, "enforce", e.target.checked)
                    }
                    className="accent-primary h-3.5 w-3.5 cursor-pointer"
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <input
                    type="number"
                    value={config.scorePenalty ?? 0}
                    onChange={(e) =>
                      updateEntry(
                        word,
                        "scorePenalty",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    className="w-14 bg-transparent border border-border rounded px-1 py-0.5 text-center text-xs tabular-nums focus:ring-1 focus:ring-ring/50 outline-none"
                  />
                </td>
                <td className="px-1 py-1.5">
                  <button
                    onClick={() => removeEntry(word)}
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/15 hover:text-destructive transition-all"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Add row */}
        <div className="flex items-center border-t border-border bg-secondary/10 px-3 py-1.5">
          <input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addEntry();
              }
            }}
            placeholder="Add word or key..."
            className="flex-1 bg-transparent text-xs font-mono outline-none placeholder:text-muted-foreground/40"
          />
          <button
            onClick={addEntry}
            disabled={!newWord.trim()}
            className="text-muted-foreground hover:text-primary disabled:opacity-20 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CategoryBadge — small count badge for tab triggers
// ---------------------------------------------------------------------------
function CountBadge({ count }: { count: number }) {
  return (
    <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-secondary text-[10px] font-medium tabular-nums text-muted-foreground px-1">
      {count}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function LanguageConfigPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [policies, setPolicies] = useState<PolicySummary[]>([]);
  const [editingLanguage, setEditingLanguage] = useState<string | null>(null);
  const [editData, setEditData] = useState<PolicyDetail | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newLanguage, setNewLanguage] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const result = await authControllerMe();
      if (!result.data.isAdmin) {
        router.push("/projects");
        return;
      }
      setIsAdmin(true);
      await loadPolicies();
    } catch {
      router.push("/");
    } finally {
      setIsLoading(false);
    }
  };

  const loadPolicies = async () => {
    const data = await fetchWithAuth(`${API_BASE}/admin/style-policies`);
    setPolicies(data);
  };

  const loadPolicy = async (language: string) => {
    const data = await fetchWithAuth(
      `${API_BASE}/admin/style-policies/${language}`,
    );
    setEditData(data);
    setEditingLanguage(language);
  };

  const handleSave = async () => {
    if (!editData || !editingLanguage) return;
    setIsSaving(true);
    try {
      await fetchWithAuth(
        `${API_BASE}/admin/style-policies/${editingLanguage}`,
        { method: "PUT", body: JSON.stringify(editData) },
      );
      toast({
        title: "Saved",
        description: `Policy for "${editingLanguage}" updated. Cache cleared.`,
      });
      await loadPolicies();
    } catch {
      toast({
        title: "Error",
        description: "Failed to save policy",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (language: string) => {
    try {
      await fetchWithAuth(
        `${API_BASE}/admin/style-policies/${language}`,
        { method: "DELETE" },
      );
      toast({
        title: "Deleted",
        description: `Policy for "${language}" removed`,
      });
      if (editingLanguage === language) {
        setEditingLanguage(null);
        setEditData(null);
      }
      await loadPolicies();
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete policy",
        variant: "destructive",
      });
    }
  };

  const handleAddLanguage = async () => {
    const lang = newLanguage.trim().toLowerCase();
    if (!lang) return;
    try {
      await fetchWithAuth(`${API_BASE}/admin/style-policies/${lang}`, {
        method: "PUT",
        body: JSON.stringify({ status: "beta" }),
      });
      toast({
        title: "Created",
        description: `Policy for "${lang}" created`,
      });
      setNewLanguage("");
      setShowAddForm(false);
      await loadPolicies();
      await loadPolicy(lang);
    } catch {
      toast({
        title: "Error",
        description: "Failed to create policy",
        variant: "destructive",
      });
    }
  };

  const updateField = useCallback(
    (field: keyof PolicyDetail, value: unknown) => {
      setEditData((prev) => (prev ? { ...prev, [field]: value } : prev));
    },
    [],
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAdmin) return null;

  // -----------------------------------------------------------------------
  // Edit view
  // -----------------------------------------------------------------------
  if (editingLanguage && editData) {
    const styleCount =
      editData.bannedPhrases.length +
      editData.bannedRegex.length +
      editData.harshWords.length +
      editData.softAvoid.length;
    const clicheCount =
      editData.clicheHookOpeners.length +
      editData.clicheLlmSmell.length +
      editData.clicheGenericFiller.length +
      editData.clicheStructurePatterns.length;
    const scoringCount =
      editData.hookPowerWords.length +
      editData.benefitWords.length +
      editData.visualActionWords.length +
      editData.ctaActionWords.length +
      editData.ctaUrgencyWords.length +
      editData.conversationalMarkers.length +
      editData.emotionalPatterns.length;
    const groundednessCount =
      editData.groundednessAbsolutePatterns.length +
      editData.groundednessScalePatterns.length +
      editData.groundednessPromoPatterns.length +
      editData.groundednessTimelinePatterns.length +
      editData.groundednessSocialProofPatterns.length;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingLanguage(null);
                setEditData(null);
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h2 className="text-lg font-semibold tracking-tight">
              {editingLanguage.toUpperCase()}
            </h2>
            <Badge
              variant={
                editData.status === "stable" ? "default" : "secondary"
              }
            >
              {editData.status}
            </Badge>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </Button>
        </div>

        {/* Tabbed editor */}
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="general" className="text-xs">
              General
            </TabsTrigger>
            <TabsTrigger value="style" className="text-xs">
              Style Filter
              <CountBadge count={styleCount} />
            </TabsTrigger>
            <TabsTrigger value="cliche" className="text-xs">
              Cliché
              <CountBadge count={clicheCount} />
            </TabsTrigger>
            <TabsTrigger value="scoring" className="text-xs">
              Scoring
              <CountBadge count={scoringCount} />
            </TabsTrigger>
            <TabsTrigger value="groundedness" className="text-xs">
              Groundedness
              <CountBadge count={groundednessCount} />
            </TabsTrigger>
          </TabsList>

          {/* General */}
          <TabsContent value="general">
            <div className="grid gap-6 md:grid-cols-[240px_1fr]">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      Status
                    </label>
                    <Select
                      value={editData.status}
                      onValueChange={(v) => updateField("status", v)}
                    >
                      <SelectTrigger className="w-full mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beta">Beta</SelectItem>
                        <SelectItem value="stable">Stable</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      Beta policies may have incomplete coverage.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <p className="text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Total rules:
                      </span>{" "}
                      {styleCount + clicheCount + scoringCount + groundednessCount}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <div>
                <WordLimitsEditor
                  value={editData.wordLimits}
                  onChange={(v) => updateField("wordLimits", v)}
                />
              </div>
            </div>
          </TabsContent>

          {/* Style Filter */}
          <TabsContent value="style">
            <div className="grid gap-6 md:grid-cols-2">
              <ManagedList
                label="Banned Phrases"
                description="Exact match — hard block"
                items={editData.bannedPhrases}
                onChange={(v) => updateField("bannedPhrases", v)}
                placeholder="Add banned phrase..."
              />
              <ManagedList
                label="Banned Regex"
                description="Regex patterns — hard block on match"
                items={editData.bannedRegex}
                onChange={(v) => updateField("bannedRegex", v)}
                placeholder="Add regex pattern..."
                mono
              />
              <ManagedList
                label="Soft Avoid"
                description="Warnings only, not filtered"
                items={editData.softAvoid}
                onChange={(v) => updateField("softAvoid", v)}
                placeholder="Add pattern description..."
              />
              <ManagedList
                label="Harsh Words"
                description="Exact match — hard block"
                items={editData.harshWords}
                onChange={(v) => updateField("harshWords", v)}
                placeholder="Add harsh word..."
              />
            </div>
          </TabsContent>

          {/* Cliché Detection */}
          <TabsContent value="cliche">
            <div className="grid gap-6 md:grid-cols-2">
              <ManagedList
                label="Hook Openers"
                description="Penalised cliché opening phrases"
                items={editData.clicheHookOpeners}
                onChange={(v) => updateField("clicheHookOpeners", v)}
                placeholder="Add opener..."
              />
              <ManagedList
                label="LLM Smell"
                description="AI-sounding buzzwords and phrases"
                items={editData.clicheLlmSmell}
                onChange={(v) => updateField("clicheLlmSmell", v)}
                placeholder="Add LLM phrase..."
              />
              <ManagedList
                label="Generic Filler"
                description="Overused social-media filler"
                items={editData.clicheGenericFiller}
                onChange={(v) => updateField("clicheGenericFiller", v)}
                placeholder="Add filler phrase..."
              />
              <ManagedList
                label="Structure Patterns"
                description="Regex patterns for cliché structures"
                items={editData.clicheStructurePatterns}
                onChange={(v) =>
                  updateField("clicheStructurePatterns", v)
                }
                placeholder="Add regex..."
                mono
              />
            </div>
          </TabsContent>

          {/* Scoring */}
          <TabsContent value="scoring">
            <div className="grid gap-6 md:grid-cols-2">
              <ManagedList
                label="Hook Power Words"
                description="Boost hook score"
                items={editData.hookPowerWords}
                onChange={(v) => updateField("hookPowerWords", v)}
                placeholder="Add power word..."
              />
              <ManagedList
                label="Benefit Words"
                description="Boost clarity score"
                items={editData.benefitWords}
                onChange={(v) => updateField("benefitWords", v)}
                placeholder="Add benefit word..."
              />
              <ManagedList
                label="Visual Action Words"
                description="Boost visuality score"
                items={editData.visualActionWords}
                onChange={(v) => updateField("visualActionWords", v)}
                placeholder="Add visual word..."
              />
              <ManagedList
                label="CTA Action Words"
                description="Boost CTA quality score"
                items={editData.ctaActionWords}
                onChange={(v) => updateField("ctaActionWords", v)}
                placeholder="Add CTA word..."
              />
              <ManagedList
                label="CTA Urgency Words"
                description="Boost CTA urgency signal"
                items={editData.ctaUrgencyWords}
                onChange={(v) => updateField("ctaUrgencyWords", v)}
                placeholder="Add urgency word..."
              />
              <ManagedList
                label="Conversational Markers"
                description="Boost authenticity score"
                items={editData.conversationalMarkers}
                onChange={(v) =>
                  updateField("conversationalMarkers", v)
                }
                placeholder="Add marker..."
              />
              <ManagedList
                label="Emotional Patterns"
                description="Regex — boost hook emotional trigger"
                items={editData.emotionalPatterns}
                onChange={(v) => updateField("emotionalPatterns", v)}
                placeholder="Add regex..."
                mono
              />
            </div>
          </TabsContent>

          {/* Groundedness */}
          <TabsContent value="groundedness">
            <div className="grid gap-6 md:grid-cols-2">
              <ManagedList
                label="Absolute Claims"
                description="e.g. 'the best', '100% guaranteed'"
                items={editData.groundednessAbsolutePatterns}
                onChange={(v) =>
                  updateField("groundednessAbsolutePatterns", v)
                }
                placeholder="Add regex..."
                mono
              />
              <ManagedList
                label="Scale Claims"
                description="e.g. 'thousands', 'millions of users'"
                items={editData.groundednessScalePatterns}
                onChange={(v) =>
                  updateField("groundednessScalePatterns", v)
                }
                placeholder="Add regex..."
                mono
              />
              <ManagedList
                label="Promo Patterns"
                description="e.g. 'limited time', 'exclusive deal'"
                items={editData.groundednessPromoPatterns}
                onChange={(v) =>
                  updateField("groundednessPromoPatterns", v)
                }
                placeholder="Add regex..."
                mono
              />
              <ManagedList
                label="Timeline Patterns"
                description="e.g. 'instant results', 'overnight'"
                items={editData.groundednessTimelinePatterns}
                onChange={(v) =>
                  updateField("groundednessTimelinePatterns", v)
                }
                placeholder="Add regex..."
                mono
              />
              <ManagedList
                label="Social Proof"
                description="e.g. 'everyone loves', 'trending'"
                items={editData.groundednessSocialProofPatterns}
                onChange={(v) =>
                  updateField("groundednessSocialProofPatterns", v)
                }
                placeholder="Add regex..."
                mono
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // List view
  // -----------------------------------------------------------------------
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">
          Language Configurations
        </h2>
        {showAddForm ? (
          <div className="flex items-center gap-2">
            <Input
              value={newLanguage}
              onChange={(e) => setNewLanguage(e.target.value)}
              placeholder="e.g. es, de, fr"
              className="w-32"
              onKeyDown={(e) => e.key === "Enter" && handleAddLanguage()}
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleAddLanguage}
              disabled={!newLanguage.trim()}
            >
              Create
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowAddForm(false);
                setNewLanguage("");
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            onClick={() => setShowAddForm(true)}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Language
          </Button>
        )}
      </div>

      {policies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No language configurations found. Add one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/30">
              <tr>
                <th className="text-left p-3 font-medium">Language</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Banned/Filter</th>
                <th className="text-left p-3 font-medium">Cliché</th>
                <th className="text-left p-3 font-medium">Scoring</th>
                <th className="text-left p-3 font-medium">Groundedness</th>
                <th className="text-left p-3 font-medium">Updated</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr
                  key={p.language}
                  className="border-t border-border hover:bg-secondary/10 cursor-pointer"
                  onClick={() => loadPolicy(p.language)}
                >
                  <td className="p-3 font-medium">
                    {p.language.toUpperCase()}
                  </td>
                  <td className="p-3">
                    <Badge
                      variant={
                        p.status === "stable" ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {p.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground tabular-nums">
                    {p.bannedPhrasesCount}
                  </td>
                  <td className="p-3 text-muted-foreground tabular-nums">
                    {p.clichePatternsCount}
                  </td>
                  <td className="p-3 text-muted-foreground tabular-nums">
                    {p.scoringWordsCount}
                  </td>
                  <td className="p-3 text-muted-foreground tabular-nums">
                    {p.groundednessPatternsCount}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {formatDate(p.updatedAt)}
                  </td>
                  <td className="p-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(p.language);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
