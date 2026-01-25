import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../src/app.module';

async function generateOpenApi() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('Script Factory API')
    .setDescription('API for UGC Script Factory')
    .setVersion('1.0')
    .addCookieAuth('access_token')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const outputDir = join(__dirname, '..', 'swagger');
  mkdirSync(outputDir, { recursive: true });

  writeFileSync(
    join(outputDir, 'openapi.json'),
    JSON.stringify(document, null, 2),
  );

  console.log('OpenAPI spec generated at swagger/openapi.json');
  await app.close();
}

generateOpenApi();
