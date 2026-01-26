import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { BatchesService } from './batches.service';
import { CreateBatchDto, RegenerateDto, BatchDto, ScriptDto, RecentScriptDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

@ApiTags('Batches')
@Controller()
@UseGuards(JwtAuthGuard)
export class BatchesController {
  constructor(private batchesService: BatchesService) {}

  @Get('scripts/recent')
  @ApiOperation({ summary: 'Get recent scripts across all projects' })
  @ApiResponse({ status: 200, type: [RecentScriptDto] })
  async getRecentScripts(@CurrentUser() user: CurrentUserPayload) {
    return this.batchesService.getRecentScripts(user.id);
  }

  @Post('projects/:projectId/batches')
  @ApiOperation({ summary: 'Create a new batch for script generation' })
  @ApiResponse({ status: 201, type: BatchDto })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Param('projectId') projectId: string,
    @Body() dto: CreateBatchDto,
  ) {
    return this.batchesService.create(user.id, projectId, dto);
  }

  @Get('projects/:projectId/batches')
  @ApiOperation({ summary: 'List all batches for a project' })
  @ApiResponse({ status: 200, type: [BatchDto] })
  async findAllByProject(
    @CurrentUser() user: CurrentUserPayload,
    @Param('projectId') projectId: string,
  ) {
    return this.batchesService.findAllByProject(user.id, projectId);
  }

  @Get('batches/:id')
  @ApiOperation({ summary: 'Get a batch by ID' })
  @ApiResponse({ status: 200, type: BatchDto })
  async findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.batchesService.findOne(user.id, id);
  }

  @Get('batches/:id/scripts')
  @ApiOperation({ summary: 'Get all scripts for a batch' })
  @ApiResponse({ status: 200, type: [ScriptDto] })
  async getScripts(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.batchesService.getScripts(user.id, id);
  }

  @Post('scripts/:id/regenerate')
  @ApiOperation({ summary: 'Regenerate a script with new instructions' })
  @ApiResponse({ status: 201, type: ScriptDto })
  async regenerateScript(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: RegenerateDto,
  ) {
    return this.batchesService.regenerateScript(user.id, id, dto);
  }
}
