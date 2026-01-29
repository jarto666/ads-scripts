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
import { PersonasService } from './personas.service';
import { CreatePersonaDto, UpdatePersonaDto, PersonaResponseDto, GeneratePersonaDto, GeneratedPersonaDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

@ApiTags('Personas')
@Controller()
@UseGuards(JwtAuthGuard)
export class PersonasController {
  constructor(private personasService: PersonasService) {}

  @Post('projects/:projectId/personas')
  @ApiOperation({ summary: 'Create a new persona for a project' })
  @ApiResponse({ status: 201, type: PersonaResponseDto })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Param('projectId') projectId: string,
    @Body() dto: CreatePersonaDto,
  ) {
    return this.personasService.create(user.id, projectId, dto);
  }

  @Post('projects/:projectId/personas/generate')
  @ApiOperation({ summary: 'Generate a persona suggestion using AI' })
  @ApiResponse({ status: 201, type: GeneratedPersonaDto })
  async generate(
    @CurrentUser() user: CurrentUserPayload,
    @Param('projectId') projectId: string,
    @Body() dto: GeneratePersonaDto,
  ) {
    return this.personasService.generate(user.id, projectId, dto);
  }

  @Get('projects/:projectId/personas')
  @ApiOperation({ summary: 'List all personas for a project' })
  @ApiResponse({ status: 200, type: [PersonaResponseDto] })
  async findAllByProject(
    @CurrentUser() user: CurrentUserPayload,
    @Param('projectId') projectId: string,
  ) {
    return this.personasService.findAllByProject(user.id, projectId);
  }

  @Get('personas/:id')
  @ApiOperation({ summary: 'Get a persona by ID' })
  @ApiResponse({ status: 200, type: PersonaResponseDto })
  async findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.personasService.findOne(user.id, id);
  }

  @Put('personas/:id')
  @ApiOperation({ summary: 'Update a persona' })
  @ApiResponse({ status: 200, type: PersonaResponseDto })
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePersonaDto,
  ) {
    return this.personasService.update(user.id, id, dto);
  }

  @Delete('personas/:id')
  @ApiOperation({ summary: 'Delete a persona' })
  @ApiResponse({ status: 200, type: PersonaResponseDto })
  async delete(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.personasService.delete(user.id, id);
  }
}
