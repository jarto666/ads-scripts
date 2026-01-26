import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { AdminUserDetailDto, GrantCreditsDto, GrantCreditsResponseDto } from './dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  // Stats
  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  // Access Requests
  @Get('requests')
  async getRequests(@Query('status') status?: string) {
    return this.adminService.getAccessRequests(status);
  }

  @Post('requests/:id/approve')
  async approveRequest(@Param('id') id: string) {
    return this.adminService.approveRequest(id);
  }

  @Post('requests/:id/reject')
  async rejectRequest(@Param('id') id: string) {
    return this.adminService.rejectRequest(id);
  }

  @Delete('requests/:id')
  async deleteRequest(@Param('id') id: string) {
    return this.adminService.deleteRequest(id);
  }

  // Users
  @Get('users')
  async getUsers() {
    return this.adminService.getUsers();
  }

  @Post('users')
  async createUser(@Body() body: { email: string; isAdmin?: boolean }) {
    return this.adminService.createUser(body.email, body.isAdmin);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Post('users/:id/toggle-admin')
  async toggleAdmin(@Param('id') id: string) {
    return this.adminService.toggleAdmin(id);
  }

  @Post('users/:id/magic-link')
  async generateMagicLink(@Param('id') id: string) {
    const link = await this.adminService.generateMagicLink(id);
    return { magicLink: link };
  }

  @Patch('users/:id/plan')
  async updateUserPlan(
    @Param('id') id: string,
    @Body() body: { plan: 'free' | 'pro' },
  ) {
    return this.adminService.updateUserPlan(id, body.plan);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user details with credits' })
  @ApiResponse({ status: 200, type: AdminUserDetailDto })
  async getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Post('users/:id/credits')
  @ApiOperation({ summary: 'Grant credits to user' })
  @ApiResponse({ status: 201, type: GrantCreditsResponseDto })
  async grantCredits(
    @Param('id') id: string,
    @Body() body: GrantCreditsDto,
  ) {
    return this.adminService.grantCredits(id, body);
  }

  // Queue
  @Get('queue/stats')
  async getQueueStats() {
    return this.adminService.getQueueStats();
  }

  @Get('queue/jobs')
  async getQueueJobs(
    @Query('status') status?: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed',
  ) {
    return this.adminService.getQueueJobs(status);
  }

  @Post('queue/jobs/:id/retry')
  async retryJob(@Param('id') id: string) {
    return this.adminService.retryJob(id);
  }
}
