import { Module } from '@nestjs/common';
import { ProjectAnalysisService } from './project-analysis.service';
import { GenerationModule } from '../generation/generation.module';

@Module({
  imports: [GenerationModule],
  providers: [ProjectAnalysisService],
  exports: [ProjectAnalysisService],
})
export class ProjectAnalysisModule {}
