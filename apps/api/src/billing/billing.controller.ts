import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  UseGuards,
  HttpCode,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { CheckoutUrlDto, SubscriptionInfoDto } from './dto';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(private billingService: BillingService) {}

  /**
   * LemonSqueezy webhook endpoint
   * This should NOT be protected by auth
   */
  @Post('webhook')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Headers('x-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody = req.rawBody?.toString();

    if (!rawBody) {
      throw new BadRequestException('Missing request body');
    }

    if (!signature) {
      throw new BadRequestException('Missing signature');
    }

    // Verify webhook signature
    const isValid = this.billingService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      this.logger.warn('Invalid webhook signature');
      throw new BadRequestException('Invalid signature');
    }

    const event = JSON.parse(rawBody);
    await this.billingService.handleWebhook(event);

    return { received: true };
  }

  /**
   * Get checkout URL for upgrading to Pro
   */
  @Post('checkout')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get checkout URL for Pro subscription' })
  @ApiResponse({ status: 200, type: CheckoutUrlDto })
  async createCheckout(@CurrentUser() user: CurrentUserPayload) {
    const url = await this.billingService.createCheckoutUrl(user.id);
    return { url };
  }

  /**
   * Get customer portal URL for managing subscription
   */
  @Get('portal')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get customer portal URL' })
  @ApiResponse({ status: 200, type: CheckoutUrlDto })
  async getPortalUrl(@CurrentUser() user: CurrentUserPayload) {
    const url = await this.billingService.createCustomerPortalUrl(user.id);
    return { url };
  }

  /**
   * Get subscription info
   */
  @Get('subscription')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get subscription info' })
  @ApiResponse({ status: 200, type: SubscriptionInfoDto })
  async getSubscription(@CurrentUser() user: CurrentUserPayload) {
    return this.billingService.getSubscriptionInfo(user.id);
  }

  /**
   * Cancel subscription (at end of billing period)
   */
  @Delete('subscription')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Cancel subscription at end of billing period' })
  async cancelSubscription(@CurrentUser() user: CurrentUserPayload) {
    await this.billingService.cancelSubscription(user.id);
    return { success: true, message: 'Subscription will be cancelled at end of billing period' };
  }
}
