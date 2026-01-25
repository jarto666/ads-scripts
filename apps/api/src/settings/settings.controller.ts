import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateProfileDto, ProfileDto, DeleteAccountResultDto } from './dto';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(AuthGuard('jwt'))
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get the current user profile' })
  @ApiResponse({ status: 200, type: ProfileDto })
  async getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.settingsService.getProfile(user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update the current user profile' })
  @ApiResponse({ status: 200, type: ProfileDto })
  async updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.settingsService.updateProfile(user.id, dto);
  }

  @Delete('account')
  @ApiOperation({ summary: 'Delete the current user account' })
  @ApiResponse({ status: 200, type: DeleteAccountResultDto })
  async deleteAccount(@CurrentUser() user: CurrentUserPayload) {
    return this.settingsService.deleteAccount(user.id);
  }
}
