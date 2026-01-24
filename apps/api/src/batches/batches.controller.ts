import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { BatchesService } from './batches.service';
import { CreateBatchDto, RegenerateDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class BatchesController {
  constructor(private batchesService: BatchesService) {}

  @Post('projects/:projectId/batches')
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Param('projectId') projectId: string,
    @Body() dto: CreateBatchDto,
  ) {
    return this.batchesService.create(user.id, projectId, dto);
  }

  @Get('projects/:projectId/batches')
  async findAllByProject(
    @CurrentUser() user: CurrentUserPayload,
    @Param('projectId') projectId: string,
  ) {
    return this.batchesService.findAllByProject(user.id, projectId);
  }

  @Get('batches/:id')
  async findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.batchesService.findOne(user.id, id);
  }

  @Get('batches/:id/scripts')
  async getScripts(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.batchesService.getScripts(user.id, id);
  }

  @Post('scripts/:id/regenerate')
  async regenerateScript(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: RegenerateDto,
  ) {
    return this.batchesService.regenerateScript(user.id, id, dto);
  }
}
