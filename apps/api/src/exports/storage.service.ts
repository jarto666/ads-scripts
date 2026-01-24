import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client | null;
  private readonly bucket: string;
  private readonly publicBaseUrl: string | null;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('S3_SECRET_ACCESS_KEY');
    const region = this.configService.get<string>('S3_REGION') || 'auto';

    this.bucket = this.configService.get<string>('S3_BUCKET') || 'exports';
    this.publicBaseUrl = this.configService.get<string>('S3_PUBLIC_BASE_URL') || null;

    if (endpoint && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        endpoint,
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: true,
      });
      this.logger.log('S3 client initialized');
    } else {
      this.s3Client = null;
      this.logger.warn('S3 not configured - exports will be disabled');
    }
  }

  isConfigured(): boolean {
    return this.s3Client !== null;
  }

  async uploadFile(
    key: string,
    content: Buffer | string,
    contentType: string,
  ): Promise<string> {
    if (!this.s3Client) {
      throw new Error('S3 storage not configured');
    }

    const body = typeof content === 'string' ? Buffer.from(content) : content;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );

    this.logger.log(`Uploaded file: ${key}`);

    // Return public URL if configured, otherwise generate signed URL
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl}/${key}`;
    }

    return this.getSignedUrl(key);
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (!this.s3Client) {
      throw new Error('S3 storage not configured');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }
}
