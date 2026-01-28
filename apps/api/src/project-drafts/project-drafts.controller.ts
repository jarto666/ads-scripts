import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { ProjectDraftsService } from './project-drafts.service';
import {
  CreateDraftDto,
  UpdateDraftDto,
  FinalizeDraftDto,
  ImportUrlDto,
  DraftDto,
  FinalizeResultDto,
  ImportResultDto,
} from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

@ApiTags('Project Drafts')
@Controller('project-drafts')
@UseGuards(JwtAuthGuard)
export class ProjectDraftsController {
  constructor(private projectDraftsService: ProjectDraftsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user draft' })
  @ApiResponse({ status: 200, type: DraftDto })
  async getDraft(@CurrentUser() user: CurrentUserPayload) {
    return this.projectDraftsService.getDraft(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create or reset draft' })
  @ApiResponse({ status: 201, type: DraftDto })
  async createDraft(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateDraftDto,
  ) {
    return this.projectDraftsService.createDraft(user.id, dto);
  }

  @Patch()
  @ApiOperation({ summary: 'Update draft state' })
  @ApiResponse({ status: 200, type: DraftDto })
  async updateDraft(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateDraftDto,
  ) {
    return this.projectDraftsService.updateDraft(user.id, dto);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete draft' })
  @ApiResponse({ status: 200 })
  async deleteDraft(@CurrentUser() user: CurrentUserPayload) {
    await this.projectDraftsService.deleteDraft(user.id);
    return { success: true };
  }

  @Post('import-url')
  @ApiOperation({ summary: 'Import project from URL (Pro only)' })
  @ApiResponse({ status: 201, type: ImportResultDto })
  async importFromUrl(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ImportUrlDto,
  ) {
    return this.projectDraftsService.importFromUrl(user.id, dto.url);
  }

  @Post('finalize')
  @ApiOperation({ summary: 'Convert draft to project' })
  @ApiResponse({ status: 201, type: FinalizeResultDto })
  async finalizeDraft(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: FinalizeDraftDto,
  ) {
    return this.projectDraftsService.finalizeDraft(user.id, dto);
  }
}
