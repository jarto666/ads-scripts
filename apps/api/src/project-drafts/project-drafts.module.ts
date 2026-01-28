import { Module } from '@nestjs/common';
import { ProjectDraftsController } from './project-drafts.controller';
import { ProjectDraftsService } from './project-drafts.service';
import { UrlExtractionModule } from '../url-extraction/url-extraction.module';
import { ProjectAnalysisModule } from '../project-analysis/project-analysis.module';

@Module({
  imports: [UrlExtractionModule, ProjectAnalysisModule],
  controllers: [ProjectDraftsController],
  providers: [ProjectDraftsService],
  exports: [ProjectDraftsService],
})
export class ProjectDraftsModule {}
