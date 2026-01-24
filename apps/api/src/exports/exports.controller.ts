import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { ExportsService } from './exports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class ExportsController {
  constructor(private exportsService: ExportsService) {}

  @Post('batches/:id/export')
  async exportBatch(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.exportsService.exportBatch(user.id, id);
  }
}
