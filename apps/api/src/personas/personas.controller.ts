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
import { PersonasService } from './personas.service';
import { CreatePersonaDto, UpdatePersonaDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class PersonasController {
  constructor(private personasService: PersonasService) {}

  @Post('projects/:projectId/personas')
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Param('projectId') projectId: string,
    @Body() dto: CreatePersonaDto,
  ) {
    return this.personasService.create(user.id, projectId, dto);
  }

  @Get('projects/:projectId/personas')
  async findAllByProject(
    @CurrentUser() user: CurrentUserPayload,
    @Param('projectId') projectId: string,
  ) {
    return this.personasService.findAllByProject(user.id, projectId);
  }

  @Get('personas/:id')
  async findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.personasService.findOne(user.id, id);
  }

  @Put('personas/:id')
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePersonaDto,
  ) {
    return this.personasService.update(user.id, id, dto);
  }

  @Delete('personas/:id')
  async delete(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.personasService.delete(user.id, id);
  }
}
