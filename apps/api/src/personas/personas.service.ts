import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenRouterClient } from '../generation/openrouter.client';
import { CreatePersonaDto, UpdatePersonaDto, GeneratePersonaDto, GeneratedPersonaDto, EnrichedFieldsDto, EnrichFieldsDto } from './dto';
import { Persona } from '@prisma/client';
import { MODEL_CONFIG } from '../config';

@Injectable()
export class PersonasService {
  constructor(
    private prisma: PrismaService,
    private openRouterClient: OpenRouterClient,
  ) {}

  private async verifyProjectAccess(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return project;
  }

  async create(userId: string, projectId: string, dto: CreatePersonaDto) {
    await this.verifyProjectAccess(userId, projectId);

    return this.prisma.persona.create({
      data: {
        ...dto,
        projectId,
      },
    });
  }

  async findAllByProject(userId: string, projectId: string) {
    await this.verifyProjectAccess(userId, projectId);

    return this.prisma.persona.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, personaId: string) {
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
      include: { project: true },
    });

    if (!persona) {
      throw new NotFoundException('Persona not found');
    }

    if (persona.project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return persona;
  }

  async update(userId: string, personaId: string, dto: UpdatePersonaDto) {
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
      include: { project: true },
    });

    if (!persona) {
      throw new NotFoundException('Persona not found');
    }

    if (persona.project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.persona.update({
      where: { id: personaId },
      data: dto,
    });
  }

  async delete(userId: string, personaId: string) {
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
      include: { project: true },
    });

    if (!persona) {
      throw new NotFoundException('Persona not found');
    }

    if (persona.project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.persona.delete({
      where: { id: personaId },
    });
  }

  async generate(userId: string, projectId: string, dto: GeneratePersonaDto): Promise<GeneratedPersonaDto> {
    // Verify user is Pro
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (user?.plan !== 'pro') {
      throw new ForbiddenException('AI persona generation is a Pro feature');
    }

    // Support draft mode where no project exists yet
    let productName = dto.productName || 'Not specified';
    let productDescription = dto.productDescription || 'Not specified';

    if (projectId !== 'draft') {
      const project = await this.verifyProjectAccess(userId, projectId);
      productName = project.name;
      productDescription = project.productDescription || 'Not specified';
    }

    const systemPrompt = `You are an expert marketing strategist and audience researcher. Your task is to create detailed buyer personas based on user descriptions.

Given a description of a target audience, generate a complete persona with:
- A memorable, descriptive name (e.g., "Busy Professional Mom", "Health-Conscious Millennial")
- A brief description of who they are
- Demographics (age range, income, location type, etc.)
- Pain points (specific problems they face, 4-6 items)
- Desires (what they want to achieve, 4-6 items)
- Objections (reasons they might hesitate to buy, 3-5 items)

Context about the product/service:
Product: ${productName}
Description: ${productDescription}

Respond ONLY with valid JSON in this exact format:
{
  "name": "Persona Name",
  "description": "Brief description of who this persona is",
  "demographics": "Age, income, location, occupation details",
  "painPoints": ["pain point 1", "pain point 2", ...],
  "desires": ["desire 1", "desire 2", ...],
  "objections": ["objection 1", "objection 2", ...]
}`;

    const response = await this.openRouterClient.chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: dto.prompt },
      ],
      {
        model: MODEL_CONFIG.personaGeneration.model,
        temperature: MODEL_CONFIG.personaGeneration.temperature,
        maxTokens: MODEL_CONFIG.personaGeneration.maxTokens,
        jsonMode: true,
      },
    );

    try {
      const parsed = JSON.parse(response);
      return {
        name: parsed.name || 'Generated Persona',
        description: parsed.description || '',
        demographics: parsed.demographics,
        painPoints: Array.isArray(parsed.painPoints) ? parsed.painPoints : [],
        desires: Array.isArray(parsed.desires) ? parsed.desires : [],
        objections: Array.isArray(parsed.objections) ? parsed.objections : [],
      };
    } catch {
      throw new Error('Failed to parse persona generation response');
    }
  }

  async enrichFields(
    userId: string,
    projectId: string,
    dto: EnrichFieldsDto,
  ): Promise<EnrichedFieldsDto> {
    // Verify Pro user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (user?.plan !== 'pro') {
      throw new ForbiddenException('AI enrichment is a Pro feature');
    }

    // Verify project access and get product description
    const project = await this.verifyProjectAccess(userId, projectId);

    // Create pseudo-persona from form data
    const personaData = {
      name: dto.name,
      description: dto.description,
      demographics: dto.demographics || null,
    } as Persona;

    // Generate requested fields using form data
    return this.generateFields(personaData, project.productDescription, dto.fields);
  }

  private async generateFields(
    persona: Persona,
    productDescription: string | null,
    fields: ('painPoints' | 'desires' | 'objections')[],
  ): Promise<EnrichedFieldsDto> {
    const fieldInstructions = [];
    if (fields.includes('painPoints')) {
      fieldInstructions.push('- painPoints: 4-6 specific problems this persona faces related to the product');
    }
    if (fields.includes('desires')) {
      fieldInstructions.push('- desires: 4-6 outcomes or goals this persona wants to achieve');
    }
    if (fields.includes('objections')) {
      fieldInstructions.push('- objections: 3-4 reasons they might hesitate to buy or try the product');
    }

    const systemPrompt = `You are enriching a marketing persona with specific data fields.

Persona: ${persona.name}
Description: ${persona.description}
${persona.demographics ? `Demographics: ${persona.demographics}` : ''}

Product context: ${productDescription || 'Not provided'}

Generate ONLY these fields:
${fieldInstructions.join('\n')}

Make each item specific and actionable, not generic. Focus on this persona's unique situation.

Respond with JSON containing only the requested fields.`;

    const response = await this.openRouterClient.chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate the requested fields for this persona.' },
      ],
      {
        model: MODEL_CONFIG.personaGeneration.model,
        temperature: 0.7,
        maxTokens: MODEL_CONFIG.personaGeneration.maxTokens,
        jsonMode: true,
      },
    );

    try {
      const parsed = JSON.parse(response);
      const result: EnrichedFieldsDto = {};

      if (fields.includes('painPoints') && Array.isArray(parsed.painPoints)) {
        result.painPoints = parsed.painPoints;
      }
      if (fields.includes('desires') && Array.isArray(parsed.desires)) {
        result.desires = parsed.desires;
      }
      if (fields.includes('objections') && Array.isArray(parsed.objections)) {
        result.objections = parsed.objections;
      }

      return result;
    } catch {
      throw new Error('Failed to parse AI enrichment response');
    }
  }
}
