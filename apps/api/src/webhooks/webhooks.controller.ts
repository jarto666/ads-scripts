import {
  Controller,
  Post,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { BillingService } from '../billing/billing.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private billingService: BillingService) {}

  /**
   * LemonSqueezy webhook endpoint
   * POST /webhooks/lemonsqueezy
   */
  @Post('lemonsqueezy')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async handleLemonSqueezy(
    @Headers('x-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody = req.rawBody?.toString();

    if (!rawBody) {
      this.logger.warn('Webhook received without body');
      throw new BadRequestException('Missing request body');
    }

    if (!signature) {
      this.logger.warn('Webhook received without signature');
      throw new BadRequestException('Missing signature');
    }

    // Verify webhook signature
    const isValid = this.billingService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      this.logger.warn('Invalid webhook signature');
      throw new BadRequestException('Invalid signature');
    }

    const event = JSON.parse(rawBody);
    this.logger.log(`Received LemonSqueezy webhook: ${event.meta?.event_name}`);
    this.logger.log(`Webhook raw body (first 500 chars): ${rawBody.substring(0, 500)}`);

    try {
      await this.billingService.handleWebhook(event);
      this.logger.log(`Webhook processed successfully: ${event.meta?.event_name}`);
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`, error.stack);
      throw error;
    }

    return { received: true };
  }
}
