"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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

export function PersonaCard<T extends PersonaCardData>({ persona, onEdit, onDelete }: PersonaCardProps<T>) {
  return (
    <Card className="bg-secondary/30 border-border/50">
      <CardContent className="pt-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground">{persona.name}</h4>
            <p className="text-sm text-muted-foreground">{persona.description}</p>
            {persona.demographics && (
              <p className="text-xs text-muted-foreground mt-1">
                {persona.demographics}
              </p>
            )}
          </div>
          {(onEdit || onDelete) && (
            <div className="flex gap-1 shrink-0 ml-2">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => onEdit(persona)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(persona.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="space-y-3 text-sm">
          {persona.painPoints.length > 0 && (
            <div>
              <p className="font-medium text-foreground mb-1.5">Pain Points</p>
              <div className="flex flex-col gap-1">
                {persona.painPoints.slice(0, 3).map((p, i) => (
                  <Badge key={i} variant="outline" className="text-xs w-fit">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {persona.desires.length > 0 && (
            <div>
              <p className="font-medium text-foreground mb-1.5">Desires</p>
              <div className="flex flex-col gap-1">
                {persona.desires.slice(0, 3).map((d, i) => (
                  <Badge key={i} variant="success" className="text-xs w-fit">
                    {d}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
