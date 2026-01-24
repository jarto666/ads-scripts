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
      'scriptId',
      'angle',
      'duration',
      'hook',
      'firstLine',
      'cta1',
      'cta2',
      'cta3',
      'score',
      'warnings',
    ];

    const rows = scripts
      .filter((s) => s.status === 'completed')
      .map((script) => {
        const storyboard = script.storyboard as StoryboardStep[] | null;
        const firstLine = storyboard?.[0]?.spoken || '';
        const ctaVariants = script.ctaVariants || [];

        return [
          script.id,
          script.angle,
          script.duration.toString(),
          this.escapeCsv(script.hook || ''),
          this.escapeCsv(firstLine),
          this.escapeCsv(ctaVariants[0] || ''),
          this.escapeCsv(ctaVariants[1] || ''),
          this.escapeCsv(ctaVariants[2] || ''),
          script.score?.toString() || '',
          this.escapeCsv(script.warnings.join('; ')),
        ];
      });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    return csvContent;
  }

  private escapeCsv(value: string): string {
    if (!value) return '';

    // Escape double quotes and wrap in quotes if contains special characters
    const escaped = value.replace(/"/g, '""');
    if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
      return `"${escaped}"`;
    }
    return escaped;
  }
}
