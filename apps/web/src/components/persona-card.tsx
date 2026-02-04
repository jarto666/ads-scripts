"use client";

import { Pencil, Trash2, Frown, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface PersonaCardData {
  id: string;
  name: string;
  description: string;
  demographics?: string | null;
  painPoints: string[];
  desires: string[];
  objections?: string[];
}

interface PersonaCardProps<T extends PersonaCardData> {
  persona: T;
  onEdit?: (persona: T) => void;
  onDelete?: (id: string) => void;
}

// Compact inline pill for card display
function CompactPill({ text, variant }: { text: string; variant: 'pain' | 'desire' }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-1 rounded text-[11px] leading-snug",
        variant === 'pain' && "bg-amber-500/10 text-amber-200",
        variant === 'desire' && "bg-emerald-500/10 text-emerald-300"
      )}
    >
      {text}
    </span>
  );
}

export function PersonaCard<T extends PersonaCardData>({ persona, onEdit, onDelete }: PersonaCardProps<T>) {
  const painPointsCount = persona.painPoints.length;
  const desiresCount = persona.desires.length;
  const maxDisplay = 3;

  return (
    <Card className="bg-secondary/30 border-border/50 hover:border-border/80 transition-colors">
      <CardContent className="pt-4 pb-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground truncate">{persona.name}</h4>
            {persona.demographics && (
              <p className="text-xs text-muted-foreground truncate">
                {persona.demographics}
              </p>
            )}
          </div>
          {(onEdit || onDelete) && (
            <div className="flex gap-0.5 shrink-0 ml-2">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => onEdit(persona)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(persona.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Description - truncated */}
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {persona.description}
        </p>

        {/* Attributes - compact layout */}
        <div className="space-y-2">
          {painPointsCount > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Frown className="h-3 w-3 text-amber-400" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Pain Points
                </span>
                <span className="text-[10px] text-muted-foreground">({painPointsCount})</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {persona.painPoints.slice(0, maxDisplay).map((p, i) => (
                  <CompactPill key={i} text={p} variant="pain" />
                ))}
                {painPointsCount > maxDisplay && (
                  <span className="text-[10px] text-muted-foreground self-center">
                    +{painPointsCount - maxDisplay} more
                  </span>
                )}
              </div>
            </div>
          )}

          {desiresCount > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Heart className="h-3 w-3 text-emerald-400" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Desires
                </span>
                <span className="text-[10px] text-muted-foreground">({desiresCount})</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {persona.desires.slice(0, maxDisplay).map((d, i) => (
                  <CompactPill key={i} text={d} variant="desire" />
                ))}
                {desiresCount > maxDisplay && (
                  <span className="text-[10px] text-muted-foreground self-center">
                    +{desiresCount - maxDisplay} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
