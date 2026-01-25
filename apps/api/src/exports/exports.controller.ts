import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { ExportsService } from './exports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { ExportResultDto } from '../batches/dto';

@ApiTags('Exports')
@Controller()
@UseGuards(JwtAuthGuard)
export class ExportsController {
  constructor(private exportsService: ExportsService) {}

  @Post('batches/:id/export')
  @ApiOperation({ summary: 'Export batch scripts to PDF and CSV' })
  @ApiResponse({ status: 201, type: ExportResultDto })
  async exportBatch(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.exportsService.exportBatch(user.id, id);
  }
}
