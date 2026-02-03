import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectDto,
  ProjectListItemDto,
  UpsertProjectFactsDto,
  ProjectFactsDto,
  GenerateFactsDto,
  GeneratedFactsDto,
} from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

@ApiTags('Projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, type: ProjectDto })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all projects' })
  @ApiResponse({ status: 200, type: [ProjectListItemDto] })
  async findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.projectsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project by ID' })
  @ApiResponse({ status: 200, type: ProjectDto })
  async findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.projectsService.findOne(user.id, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a project' })
  @ApiResponse({ status: 200, type: ProjectDto })
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project' })
  @ApiResponse({ status: 200, type: ProjectDto })
  async delete(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.projectsService.delete(user.id, id);
  }

  // ============================================================
  // ProjectFacts endpoints - Grounding data to prevent hallucinations
  // ============================================================

  @Get(':id/facts')
  @ApiOperation({ summary: 'Get project facts (grounding data)' })
  @ApiResponse({ status: 200, type: ProjectFactsDto })
  async getFacts(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.projectsService.getFactsByProjectId(user.id, id);
  }

  @Put(':id/facts')
  @ApiOperation({ summary: 'Create or update project facts (grounding data)' })
  @ApiResponse({ status: 200, type: ProjectFactsDto })
  async upsertFacts(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpsertProjectFactsDto,
  ) {
    return this.projectsService.upsertFacts(user.id, id, dto);
  }

  @Post(':id/facts/generate')
  @ApiOperation({ summary: 'Generate project facts using AI (Pro feature)' })
  @ApiResponse({ status: 201, type: GeneratedFactsDto })
  async generateFacts(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: GenerateFactsDto,
  ) {
    return this.projectsService.generateFacts(user.id, id, dto);
  }
}
