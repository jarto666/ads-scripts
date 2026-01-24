import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';

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
}
