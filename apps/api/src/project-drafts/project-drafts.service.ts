import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UrlExtractionService,
  ExtractionError,
} from '../url-extraction/url-extraction.service';
import { ProjectAnalysisService } from '../project-analysis/project-analysis.service';
import {
  CreateDraftDto,
  UpdateDraftDto,
  FinalizeDraftDto,
  DraftDto,
  FinalizeResultDto,
  PersonaSuggestionDto,
  ImportResultDto,
} from './dto';

@Injectable()
export class ProjectDraftsService {
  private readonly logger = new Logger(ProjectDraftsService.name);

  constructor(
    private prisma: PrismaService,
    private urlExtraction: UrlExtractionService,
    private projectAnalysis: ProjectAnalysisService,
  ) {}

  private readonly IMPORT_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

  async getDraft(userId: string): Promise<DraftDto | null> {
    const draft = await this.prisma.projectDraft.findUnique({
      where: { userId },
    });

    if (!draft) {
      return null;
    }

    // Detect stale imports (stuck in 'importing' for too long, e.g., after API restart)
    if (draft.importStatus === 'importing') {
      const timeSinceUpdate = Date.now() - draft.updatedAt.getTime();
      if (timeSinceUpdate > this.IMPORT_TIMEOUT_MS) {
        this.logger.warn(
          `Detected stale import for user ${userId}, marking as failed (stuck for ${Math.round(timeSinceUpdate / 1000)}s)`,
        );
        const updatedDraft = await this.prisma.projectDraft.update({
          where: { userId },
          data: {
            importStatus: 'failed',
            importError: 'Import timed out. Please try again.',
          },
        });
        return this.mapToDraftDto(updatedDraft);
      }
    }

    return this.mapToDraftDto(draft);
  }

  async createDraft(userId: string, dto: CreateDraftDto): Promise<DraftDto> {
    // Delete existing draft first (one draft per user)
    await this.prisma.projectDraft.deleteMany({ where: { userId } });

    const draft = await this.prisma.projectDraft.create({
      data: {
        userId,
        importMethod: dto.importMethod,
        currentStep: 0,
        completedSteps: [],
        formData: {},
        sourceUrl: dto.sourceUrl,
        importStatus: dto.importMethod === 'url' ? 'pending' : null,
      },
    });

    return this.mapToDraftDto(draft);
  }

  async updateDraft(userId: string, dto: UpdateDraftDto): Promise<DraftDto> {
    const existingDraft = await this.prisma.projectDraft.findUnique({
      where: { userId },
    });

    if (!existingDraft) {
      throw new NotFoundException('No draft found');
    }

    // Merge form data if provided
    const currentFormData = (existingDraft.formData as Record<string, unknown>) || {};
    const newFormData = dto.formData
      ? { ...currentFormData, ...dto.formData }
      : currentFormData;

    const draft = await this.prisma.projectDraft.update({
      where: { userId },
      data: {
        ...(dto.currentStep !== undefined && { currentStep: dto.currentStep }),
        ...(dto.completedSteps && { completedSteps: dto.completedSteps }),
        formData: newFormData as object,
      },
    });

    return this.mapToDraftDto(draft);
  }

  async deleteDraft(userId: string): Promise<void> {
    const draft = await this.prisma.projectDraft.findUnique({
      where: { userId },
    });

    if (!draft) {
      throw new NotFoundException('No draft found');
    }

    await this.prisma.projectDraft.delete({
      where: { userId },
    });
  }

  async importFromUrl(userId: string, url: string): Promise<ImportResultDto> {
    // Verify user is Pro
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (user?.plan !== 'pro') {
      throw new ForbiddenException('URL import is a Pro feature');
    }

    // Get or create draft
    let draft = await this.prisma.projectDraft.findUnique({
      where: { userId },
    });

    if (!draft) {
      draft = await this.prisma.projectDraft.create({
        data: {
          userId,
          importMethod: 'url',
          sourceUrl: url,
          currentStep: 0,
          completedSteps: [],
          formData: {},
          importStatus: 'importing',
        },
      });
    } else {
      // Update existing draft to importing status
      draft = await this.prisma.projectDraft.update({
        where: { userId },
        data: {
          sourceUrl: url,
          importStatus: 'importing',
          importError: null,
        },
      });
    }

    this.logger.log(`Starting async URL import for user ${userId}: ${url}`);

    // Start background import (fire-and-forget)
    this.processUrlImport(userId, url).catch((error) => {
      this.logger.error(`Background import failed for user ${userId}:`, error);
    });

    // Return immediately with the draft in importing state
    return {
      success: true,
      draft: this.mapToDraftDto(draft),
    };
  }

  // Background processing method
  private async processUrlImport(userId: string, url: string): Promise<void> {
    try {
      // Extract content from URL
      const extractionData = await this.urlExtraction.extractFromUrl(url);

      // Analyze with AI
      const analysisData = await this.projectAnalysis.analyzeExtraction(extractionData);

      // Update draft with extracted data
      await this.prisma.projectDraft.update({
        where: { userId },
        data: {
          currentStep: 1, // Skip to basic info step
          completedSteps: [0],
          importStatus: 'completed',
          importError: null,
          extractedAt: new Date(),
          extractionData: {
            title: extractionData.title,
            description: extractionData.description,
            offers: extractionData.offers,
            pageType: extractionData.pageType,
            language: extractionData.language,
          } as object,
          analyzedAt: new Date(),
          analysisData: analysisData as object,
          formData: {
            name: extractionData.title || '',
            productDescription:
              analysisData.productSummary ||
              extractionData.description ||
              '',
            brandVoice: analysisData.brandVoice || '',
            language: extractionData.language || 'en',
            offer: extractionData.offers.length > 0 ? extractionData.offers[0] : '',
            suggestedPersonas: analysisData.suggestedPersonas,
            selectedPersonaIds: analysisData.suggestedPersonas.map((p) => p.id),
          } as object,
        },
      });

      this.logger.log(
        `URL import successful for user ${userId}: extracted "${extractionData.title}", ${analysisData.suggestedPersonas.length} personas suggested`,
      );
    } catch (error) {
      this.logger.error(`URL import failed for user ${userId}:`, error);

      // Determine error message and code
      let errorMessage = 'Failed to import from URL';
      if (this.isExtractionError(error)) {
        errorMessage = `${error.code}: ${error.message}`;
      }

      // Update draft with error status
      await this.prisma.projectDraft.update({
        where: { userId },
        data: {
          importStatus: 'failed',
          importError: errorMessage,
        },
      });
    }
  }

  private isExtractionError(error: unknown): error is ExtractionError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error
    );
  }

  async finalizeDraft(
    userId: string,
    dto: FinalizeDraftDto,
  ): Promise<FinalizeResultDto> {
    const draft = await this.prisma.projectDraft.findUnique({
      where: { userId },
    });

    if (!draft) {
      throw new NotFoundException('No draft found');
    }

    const formData = draft.formData as Record<string, unknown>;

    // Validate required fields
    if (!formData.name || !formData.productDescription) {
      throw new ForbiddenException(
        'Draft is incomplete. Name and product description are required.',
      );
    }

    // Create project and personas in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create project
      const project = await tx.project.create({
        data: {
          userId,
          name: formData.name as string,
          productDescription: formData.productDescription as string,
          offer: (formData.offer as string) || null,
          brandVoice: (formData.brandVoice as string) || null,
          forbiddenClaims: (formData.forbiddenClaims as string[]) || [],
          language: (formData.language as string) || 'en',
          region: (formData.region as string) || null,
        },
      });

      // Create selected personas
      const suggestedPersonas =
        (formData.suggestedPersonas as PersonaSuggestionDto[]) || [];
      const selectedIds =
        dto.selectedPersonaIds || suggestedPersonas.map((p) => p.id);

      const personasToCreate = suggestedPersonas.filter((p) =>
        selectedIds.includes(p.id),
      );

      let personasCreated = 0;
      for (const persona of personasToCreate) {
        await tx.persona.create({
          data: {
            projectId: project.id,
            name: persona.name,
            description: persona.description,
            demographics: persona.demographics || null,
            painPoints: persona.painPoints || [],
            desires: persona.desires || [],
            objections: persona.objections || [],
          },
        });
        personasCreated++;
      }

      // Delete draft
      await tx.projectDraft.delete({ where: { userId } });

      return { projectId: project.id, personasCreated };
    });

    this.logger.log(
      `Finalized draft for user ${userId}: created project ${result.projectId} with ${result.personasCreated} personas`,
    );

    return result;
  }

  // Helper to map Prisma model to DTO
  private mapToDraftDto(draft: {
    id: string;
    userId: string;
    currentStep: number;
    completedSteps: number[];
    sourceUrl: string | null;
    importMethod: string;
    importStatus: string | null;
    importError: string | null;
    formData: unknown;
    extractionData: unknown;
    analysisData: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): DraftDto {
    return {
      id: draft.id,
      currentStep: draft.currentStep,
      completedSteps: draft.completedSteps,
      sourceUrl: draft.sourceUrl || undefined,
      importMethod: draft.importMethod,
      importStatus: (draft.importStatus as DraftDto['importStatus']) || undefined,
      importError: draft.importError || undefined,
      formData: (draft.formData as DraftDto['formData']) || {},
      extractionData: draft.extractionData as DraftDto['extractionData'],
      analysisData: draft.analysisData as DraftDto['analysisData'],
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    };
  }
}
