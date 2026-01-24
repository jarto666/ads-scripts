import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePersonaDto, UpdatePersonaDto } from './dto';

@Injectable()
export class PersonasService {
  constructor(private prisma: PrismaService) {}

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
}
