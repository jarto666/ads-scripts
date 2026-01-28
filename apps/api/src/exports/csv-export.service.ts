import { Injectable } from '@nestjs/common';
import { Script } from '@prisma/client';

interface StoryboardStep {
  t: string;
  shot: string;
  onScreen: string;
  spoken: string;
  broll?: string[];
}

@Injectable()
export class CsvExportService {
  generateCsv(scripts: Script[]): string {
    const headers = [
      '#',
      'Angle',
      'Duration (s)',
      'Hook',
      'Full Script',
      'Storyboard',
      'CTA Variants',
      'Filming Checklist',
      'Warnings',
    ];

    const rows = scripts
      .filter((s) => s.status === 'completed')
      .map((script, index) => {
        const storyboard = script.storyboard as StoryboardStep[] | null;

        // Full spoken script — all spoken lines concatenated
        const fullScript = storyboard
          ? storyboard.map((step) => step.spoken).filter(Boolean).join('\n')
          : '';

        // Storyboard — readable beat breakdown
        const storyboardText = storyboard
          ? storyboard
              .map((step) => {
                const parts = [`[${step.t}]`];
                if (step.shot) parts.push(`Shot: ${step.shot}`);
                if (step.spoken) parts.push(`Spoken: "${step.spoken}"`);
                if (step.onScreen) parts.push(`On-screen: ${step.onScreen}`);
                if (step.broll?.length)
                  parts.push(`B-roll: ${step.broll.join(', ')}`);
                return parts.join('\n');
              })
              .join('\n---\n')
          : '';

        const ctaVariants = (script.ctaVariants || []).join('\n');
        const filmingChecklist = (script.filmingChecklist || []).join('\n');
        const warnings = (script.warnings || []).join('\n');

        return [
          (index + 1).toString(),
          script.angle,
          script.duration.toString(),
          script.hook || '',
          fullScript,
          storyboardText,
          ctaVariants,
          filmingChecklist,
          warnings,
        ].map((v) => this.escapeCsv(v));
      });

    const csvContent = [
      headers.map((h) => this.escapeCsv(h)).join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    return '\uFEFF' + csvContent; // BOM for Excel UTF-8 compatibility
  }

  private escapeCsv(value: string): string {
    if (!value) return '';

    const escaped = value.replace(/"/g, '""');
    if (
      escaped.includes(',') ||
      escaped.includes('"') ||
      escaped.includes('\n') ||
      escaped.includes('\r')
    ) {
      return `"${escaped}"`;
    }
    return escaped;
  }
}
