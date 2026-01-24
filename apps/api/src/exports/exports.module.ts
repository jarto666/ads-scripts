import { Module } from '@nestjs/common';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { CsvExportService } from './csv-export.service';
import { PdfExportService } from './pdf-export.service';
import { StorageService } from './storage.service';

@Module({
  controllers: [ExportsController],
  providers: [
    ExportsService,
    CsvExportService,
    PdfExportService,
    StorageService,
  ],
  exports: [ExportsService],
})
export class ExportsModule {}
