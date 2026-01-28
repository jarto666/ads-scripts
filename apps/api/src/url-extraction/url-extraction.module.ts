import { Module } from '@nestjs/common';
import { BrowserlessClient } from './browserless.client';
import { UrlExtractionService } from './url-extraction.service';
import { GenerationModule } from '../generation/generation.module';

@Module({
  imports: [GenerationModule],
  providers: [BrowserlessClient, UrlExtractionService],
  exports: [UrlExtractionService, BrowserlessClient],
})
export class UrlExtractionModule {}
