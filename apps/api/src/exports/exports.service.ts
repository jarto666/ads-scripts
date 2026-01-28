import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CsvExportService } from './csv-export.service';
import { PdfExportService } from './pdf-export.service';
import { StorageService } from './storage.service';

@Injectable()
export class ExportsService {
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
}
