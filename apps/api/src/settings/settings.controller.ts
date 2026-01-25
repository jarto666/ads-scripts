import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SettingsService } from './settings.service';
import { UpdateProfileDto } from './dto';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

@Controller('settings')
@UseGuards(AuthGuard('jwt'))
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.settingsService.getProfile(user.id);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.settingsService.updateProfile(user.id, dto);
  }

  @Delete('account')
  async deleteAccount(@CurrentUser() user: CurrentUserPayload) {
    return this.settingsService.deleteAccount(user.id);
  }
}
