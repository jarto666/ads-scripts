import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenRouterClient } from '../generation/openrouter.client';
import { CreateProjectDto, UpdateProjectDto, UpsertProjectFactsDto, GenerateFactsDto, GeneratedFactsDto } from './dto';
import { MODEL_CONFIG } from '../config';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private prisma: PrismaService,
    private openRouterClient: OpenRouterClient,
  ) {}

  async create(userId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.project.findMany({
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        productDescription: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        personas: true,
      },
    });

    if (!project || project.deletedAt) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return project;
  }

  async update(userId: string, projectId: string, dto: UpdateProjectDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.deletedAt) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: dto,
    });
  }

  async delete(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.deletedAt) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
    });
  }

  // ============================================================
  // ProjectFacts CRUD - Grounding data to prevent hallucinations
  // ============================================================

  async getFactsByProjectId(userId: string, projectId: string) {
    // Verify project ownership first
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.deletedAt) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Get facts or return null if not set
    return this.prisma.projectFacts.findUnique({
      where: { projectId },
    });
  }

  async upsertFacts(userId: string, projectId: string, dto: UpsertProjectFactsDto) {
    // Verify project ownership first
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.deletedAt) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Upsert facts - create if not exists, update if exists
    return this.prisma.projectFacts.upsert({
      where: { projectId },
      create: {
        projectId,
        features: dto.features ?? [],
        workflowSteps: dto.workflowSteps ?? [],
        pricing: dto.pricing,
        promos: dto.promos ?? [],
        ctaRules: dto.ctaRules ?? [],
        allowedProof: dto.allowedProof ?? [],
        harshLabelsBan: dto.harshLabelsBan ?? [],
      },
      update: {
        ...(dto.features !== undefined && { features: dto.features }),
        ...(dto.workflowSteps !== undefined && { workflowSteps: dto.workflowSteps }),
        ...(dto.pricing !== undefined && { pricing: dto.pricing }),
        ...(dto.promos !== undefined && { promos: dto.promos }),
        ...(dto.ctaRules !== undefined && { ctaRules: dto.ctaRules }),
        ...(dto.allowedProof !== undefined && { allowedProof: dto.allowedProof }),
        ...(dto.harshLabelsBan !== undefined && { harshLabelsBan: dto.harshLabelsBan }),
      },
    });
  }

  // ============================================================
  // ProjectFacts AI Generation
  // ============================================================

  async generateFacts(
    userId: string,
    projectId: string,
    dto: GenerateFactsDto,
  ): Promise<GeneratedFactsDto> {
    // Verify user is Pro
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (user?.plan !== 'pro') {
      throw new ForbiddenException('AI facts generation is a Pro feature');
    }

    // Support draft mode where no project exists yet
    let productName = dto.productName || 'Not specified';
    let productDescription = dto.productDescription || 'Not specified';

    if (projectId !== 'draft') {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project || project.deletedAt) {
        throw new NotFoundException('Project not found');
      }

      if (project.userId !== userId) {
        throw new ForbiddenException('Access denied');
      }

      productName = project.name;
      productDescription = project.productDescription || 'Not specified';
    }

    this.logger.log(`Generating facts for product: ${productName}`);
    this.logger.debug(`Product description: ${productDescription.substring(0, 200)}...`);

    const systemPrompt = `You are an expert at extracting factual grounding data from product descriptions for ad script generation.
Your task is to extract facts that can be used to ground AI-generated ad scripts and prevent hallucinations.

Given a product description, extract the following categories:

1. **features**: Key product features and capabilities (what the product does, its benefits)
2. **workflowSteps**: How to use the product (signup flow, key actions, getting started steps)
3. **pricing**: Any pricing information mentioned (prices, plans, tiers) - use null if not mentioned
4. **promos**: Promotional offers (discounts, free trials, limited-time offers) - use empty array if none
5. **ctaRules**: Appropriate call-to-action phrases based on the product type (e.g., "Try it free", "Get started", "Sign up now")
6. **allowedProof**: Statistics, testimonials, awards, or social proof mentioned - use empty array if none
7. **harshLabelsBan**: Words to avoid when addressing the target audience (e.g., if targeting professionals, avoid "clueless", "struggling", etc.)
8. **brandVoice**: A brief description of the brand's tone and style based on the product (e.g., "Professional yet approachable, uses industry terminology but explains concepts clearly")
9. **forbiddenClaims**: Claims that should NEVER be made for this product type (e.g., for supplements: "cures", "treats disease"; for software: "100% secure", "never crashes"; for courses: "guaranteed income", "get rich quick")

GUIDELINES:
- Extract features broadly - include both explicit features and strongly implied capabilities
- For workflowSteps, infer the typical user journey if not explicitly stated
- For ctaRules, suggest 2-4 appropriate CTAs based on the product type even if not explicitly stated
- For harshLabelsBan, think about the target audience and what terms might be offensive or condescending
- For brandVoice, infer the appropriate tone from the product type and description
- For forbiddenClaims, think about legal/regulatory issues and misleading claims common in this product category

Product: ${productName}
Description: ${productDescription}

Respond with valid JSON:
{
  "features": ["feature 1", "feature 2", ...],
  "workflowSteps": ["step 1", "step 2", ...],
  "pricing": "pricing info or null",
  "promos": ["promo 1", ...],
  "ctaRules": ["CTA 1", "CTA 2", ...],
  "allowedProof": ["stat or testimonial 1", ...],
  "harshLabelsBan": ["word 1", "word 2", ...],
  "brandVoice": "description of tone and style",
  "forbiddenClaims": ["claim 1", "claim 2", ...]
}`;

    const response = await this.openRouterClient.chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Extract the grounding facts from the product description above.' },
      ],
      {
        model: MODEL_CONFIG.personaGeneration.model,
        temperature: 0.3, // Lower temperature for more consistent extraction
        maxTokens: MODEL_CONFIG.personaGeneration.maxTokens,
        jsonMode: true,
      },
    );

    this.logger.log(`LLM response received, length: ${response.length}`);
    this.logger.debug(`LLM raw response: ${response}`);

    try {
      const parsed = JSON.parse(response);
      this.logger.log(`Parsed facts - features: ${parsed.features?.length || 0}, workflowSteps: ${parsed.workflowSteps?.length || 0}, ctaRules: ${parsed.ctaRules?.length || 0}`);

      const result = {
        features: parsed.features || [],
        workflowSteps: parsed.workflowSteps || [],
        pricing: parsed.pricing || undefined,
        promos: parsed.promos || [],
        ctaRules: parsed.ctaRules || [],
        allowedProof: parsed.allowedProof || [],
        harshLabelsBan: parsed.harshLabelsBan || [],
        brandVoice: parsed.brandVoice || undefined,
        forbiddenClaims: parsed.forbiddenClaims || [],
      };

      this.logger.log(`Returning facts: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to parse LLM response: ${error}`);
      this.logger.error(`Raw response was: ${response}`);
      throw new Error('Failed to parse AI response');
    }
  }
}
