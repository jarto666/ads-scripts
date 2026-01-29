import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenRouterClient } from '../generation/openrouter.client';
import { CreatePersonaDto, UpdatePersonaDto, GeneratePersonaDto, GeneratedPersonaDto } from './dto';

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
        model: 'anthropic/claude-3.5-haiku',
        temperature: 0.7,
        maxTokens: 1024,
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
}
