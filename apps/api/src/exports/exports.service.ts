import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CsvExportService } from './csv-export.service';
import { PdfExportService } from './pdf-export.service';
import { StorageService } from './storage.service';

interface ScriptAnalytics {
  specificity?: number;
  novelty?: number;
  audienceFit?: number;
  hookStrength?: number;
  finalScore?: number;
  batchPosition?: number;
  totalGenerated?: number;
  totalFiltered?: number;
  penalties?: { diversityPenalty?: number };
  hookMeta?: {
    wordCount?: number;
    hasQuestion?: boolean;
    hasNumber?: boolean;
    powerWordsFound?: string[];
  };
  scoredAt?: string;
}

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);

  constructor(
    private prisma: PrismaService,
    private csvExport: CsvExportService,
    private pdfExport: PdfExportService,
    private storage: StorageService,
  ) {}

  async exportBatch(
    userId: string,
    batchId: string,
  ): Promise<{ pdfUrl: string; csvUrl?: string }> {
    // Verify access
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        project: {
          include: {
            personas: true,
          },
        },
        scripts: true,
      },
    });

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    if (batch.project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (batch.status !== 'completed') {
      throw new Error('Batch is not completed yet');
    }

    // Check if user is Pro (for CSV export)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    const isPro = user?.plan === 'pro';

    // Always regenerate exports (scripts may have been added via regeneration)
    const completedScripts = batch.scripts.filter(
      (s: typeof batch.scripts[number]) => s.status === 'completed',
    );

    if (completedScripts.length === 0) {
      throw new Error('No completed scripts to export');
    }

    // Use timestamp to ensure fresh URLs
    const timestamp = Date.now();
    const basePath = `exports/${batch.projectId}/${batchId}/${timestamp}`;

    // Generate and upload CSV (Pro only)
    let csvUrl: string | undefined;
    if (isPro) {
      const csvContent = this.csvExport.generateCsv(completedScripts);
      const csvKey = `${basePath}/producer-sheet.csv`;
      csvUrl = await this.storage.uploadFile(csvKey, csvContent, 'text/csv');
    }

    // Generate and upload PDF
    const pdfBuffer = await this.pdfExport.generatePdf(
      batch.project,
      completedScripts,
      batch.personaIds,
    );
    const pdfKey = `${basePath}/creator-pack.pdf`;
    const pdfUrl = await this.storage.uploadFile(
      pdfKey,
      pdfBuffer,
      'application/pdf',
    );

    // Update batch with URLs
    await this.prisma.batch.update({
      where: { id: batchId },
      data: { pdfUrl, ...(csvUrl && { csvUrl }) },
    });

    return { pdfUrl, csvUrl };
  }

  /**
   * Export analytics report for admin review
   * Returns JSON with detailed scoring data for all scripts in batch
   */
  async exportAnalyticsReport(
    userId: string,
    batchId: string,
  ): Promise<{ jsonUrl: string }> {
    // Verify access and admin status
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        project: {
          include: {
            personas: true,
          },
        },
        scripts: true,
      },
    });

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    if (batch.project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const completedScripts = batch.scripts.filter(
      (s) => s.status === 'completed',
    );

    if (completedScripts.length === 0) {
      throw new Error('No completed scripts to export');
    }

    // Build analytics report
    const report = this.buildAnalyticsReport(batch, completedScripts);

    // Upload JSON
    const timestamp = Date.now();
    const jsonKey = `exports/${batch.projectId}/${batchId}/${timestamp}/analytics-report.json`;
    const jsonContent = JSON.stringify(report, null, 2);
    const jsonUrl = await this.storage.uploadFile(jsonKey, jsonContent, 'application/json');

    this.logger.log(`Analytics report exported for batch ${batchId}`);

    return { jsonUrl };
  }

  private buildAnalyticsReport(
    batch: {
      id: string;
      quality: string;
      platform: string;
      angles: string[];
      durations: number[];
      requestedCount: number;
      project: {
        name: string;
        productDescription: string;
        personas: Array<{ name: string; description: string }>;
      };
    },
    scripts: Array<{
      id: string;
      hook: string | null;
      angle: string;
      duration: number;
      score: number | null;
      warnings: unknown;
      analyticsData: unknown;
      storyboard: unknown;
      ctaVariants: unknown;
      filmingChecklist: unknown;
    }>,
  ) {
    // Extract analytics from each script
    const scriptAnalytics = scripts.map((script) => {
      const analytics = (script.analyticsData as ScriptAnalytics) || {};
      return {
        scriptId: script.id,
        hook: script.hook || 'No hook',
        angle: script.angle,
        duration: script.duration,
        storyboard: script.storyboard,
        ctaVariants: script.ctaVariants,
        filmingChecklist: script.filmingChecklist,
        filmabilityScore: script.score,
        warnings: script.warnings,
        qualityScores: {
          specificity: analytics.specificity ?? null,
          novelty: analytics.novelty ?? null,
          audienceFit: analytics.audienceFit ?? null,
          hookStrength: analytics.hookStrength ?? null,
          finalScore: analytics.finalScore ?? null,
        },
        batchPosition: analytics.batchPosition ?? null,
        penalties: analytics.penalties ?? {},
        hookMeta: analytics.hookMeta ?? {},
      };
    });

    // Calculate batch statistics
    const validScores = scriptAnalytics.filter((s) => s.qualityScores.finalScore !== null);
    const avgScore = validScores.length > 0
      ? Math.round(validScores.reduce((sum, s) => sum + (s.qualityScores.finalScore || 0), 0) / validScores.length)
      : null;

    const avgSpecificity = validScores.length > 0
      ? Math.round(validScores.reduce((sum, s) => sum + (s.qualityScores.specificity || 0), 0) / validScores.length)
      : null;

    const avgNovelty = validScores.length > 0
      ? Math.round(validScores.reduce((sum, s) => sum + (s.qualityScores.novelty || 0), 0) / validScores.length)
      : null;

    const avgAudienceFit = validScores.length > 0
      ? Math.round(validScores.reduce((sum, s) => sum + (s.qualityScores.audienceFit || 0), 0) / validScores.length)
      : null;

    const avgHookStrength = validScores.length > 0
      ? Math.round(validScores.reduce((sum, s) => sum + (s.qualityScores.hookStrength || 0), 0) / validScores.length)
      : null;

    // Count scripts meeting thresholds
    const minHookStrength = 30;
    const minFinalScore = 40;
    const aboveHookThreshold = scriptAnalytics.filter(
      (s) => (s.qualityScores.hookStrength ?? 0) >= minHookStrength,
    ).length;
    const aboveFinalThreshold = scriptAnalytics.filter(
      (s) => (s.qualityScores.finalScore ?? 0) >= minFinalScore,
    ).length;

    // Get first script's batch context for totals
    const firstAnalytics = (scripts[0]?.analyticsData as ScriptAnalytics) || {};

    return {
      exportedAt: new Date().toISOString(),
      batchInfo: {
        batchId: batch.id,
        projectName: batch.project.name,
        quality: batch.quality,
        platform: batch.platform,
        angles: batch.angles,
        durations: batch.durations,
        requestedCount: batch.requestedCount,
        returnedCount: scripts.length,
        totalGenerated: firstAnalytics.totalGenerated ?? null,
        totalFiltered: firstAnalytics.totalFiltered ?? null,
      },
      personas: batch.project.personas.map((p) => ({
        name: p.name,
        description: p.description.substring(0, 200),
      })),
      batchStatistics: {
        averageScores: {
          finalScore: avgScore,
          specificity: avgSpecificity,
          novelty: avgNovelty,
          audienceFit: avgAudienceFit,
          hookStrength: avgHookStrength,
        },
        thresholdCompliance: {
          hookStrengthThreshold: minHookStrength,
          scriptsAboveHookThreshold: aboveHookThreshold,
          finalScoreThreshold: minFinalScore,
          scriptsAboveFinalThreshold: aboveFinalThreshold,
        },
        scoreDistribution: {
          finalScore: this.getScoreDistribution(scriptAnalytics.map((s) => s.qualityScores.finalScore)),
          audienceFit: this.getScoreDistribution(scriptAnalytics.map((s) => s.qualityScores.audienceFit)),
        },
      },
      scripts: scriptAnalytics,
    };
  }

  private getScoreDistribution(scores: (number | null)[]): Record<string, number> {
    const validScores = scores.filter((s): s is number => s !== null);
    if (validScores.length === 0) return {};

    return {
      min: Math.min(...validScores),
      max: Math.max(...validScores),
      median: this.median(validScores),
      '0-20': validScores.filter((s) => s <= 20).length,
      '21-40': validScores.filter((s) => s > 20 && s <= 40).length,
      '41-60': validScores.filter((s) => s > 40 && s <= 60).length,
      '61-80': validScores.filter((s) => s > 60 && s <= 80).length,
      '81-100': validScores.filter((s) => s > 80).length,
    };
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
}
