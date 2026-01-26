import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';

// LemonSqueezy webhook event types
interface LemonSqueezyWebhookEvent {
  meta: {
    event_name: string;
    custom_data?: {
      user_id?: string;
    };
  };
  data: {
    id: string;
    type: string;
    attributes: {
      store_id: number;
      customer_id: number;
      order_id?: number;
      product_id?: number;
      variant_id?: number;
      status: string;
      user_email: string;
      user_name?: string;
      ends_at?: string;
      renews_at?: string;
      created_at: string;
      updated_at: string;
      // For orders
      total?: number;
      first_order_item?: {
        product_name: string;
        variant_name: string;
      };
    };
  };
}

// Credit pack product IDs (configure these in your LemonSqueezy dashboard)
const CREDIT_PACKS: Record<number, { name: string; credits: number }> = {
  // These IDs should match your LemonSqueezy product variant IDs
  // Example: 123456: { name: 'Starter Pack', credits: 100 },
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private creditsService: CreditsService,
  ) {}

  /**
   * Verify LemonSqueezy webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = this.configService.get<string>('LEMONSQUEEZY_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.error('LEMONSQUEEZY_WEBHOOK_SECRET not configured');
      return false;
    }

    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  }

  /**
   * Handle incoming webhook from LemonSqueezy
   */
  async handleWebhook(event: LemonSqueezyWebhookEvent): Promise<void> {
    const eventName = event.meta.event_name;
    this.logger.log(`Processing LemonSqueezy webhook: ${eventName}`);

    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated':
      case 'subscription_resumed':
        await this.handleSubscriptionActive(event);
        break;

      case 'subscription_cancelled':
        await this.handleSubscriptionCancelled(event);
        break;

      case 'subscription_expired':
        await this.handleSubscriptionExpired(event);
        break;

      case 'subscription_payment_success':
        await this.handleSubscriptionPaymentSuccess(event);
        break;

      case 'subscription_payment_failed':
        await this.handleSubscriptionPaymentFailed(event);
        break;

      case 'order_created':
        await this.handleOrderCreated(event);
        break;

      default:
        this.logger.log(`Unhandled webhook event: ${eventName}`);
    }
  }

  /**
   * Handle subscription activation (new or resumed)
   */
  private async handleSubscriptionActive(event: LemonSqueezyWebhookEvent): Promise<void> {
    const { attributes } = event.data;
    const user = await this.findUserByEmail(attributes.user_email);

    if (!user) {
      this.logger.warn(`User not found for email: ${attributes.user_email}`);
      return;
    }

    // Update user with subscription info
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        plan: 'pro',
        lemonSqueezyCustomerId: String(attributes.customer_id),
        lemonSqueezySubscriptionId: event.data.id,
        subscriptionStatus: attributes.status,
        subscriptionEndsAt: attributes.ends_at ? new Date(attributes.ends_at) : null,
      },
    });

    // Grant subscription credits if this is a new subscription
    if (event.meta.event_name === 'subscription_created') {
      const endsAt = attributes.renews_at
        ? new Date(attributes.renews_at)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await this.creditsService.grantSubscriptionCredits(user.id, endsAt);
      this.logger.log(`Granted subscription credits to user ${user.email}`);
    }
  }

  /**
   * Handle subscription cancellation (will expire at end of period)
   */
  private async handleSubscriptionCancelled(event: LemonSqueezyWebhookEvent): Promise<void> {
    const { attributes } = event.data;
    const user = await this.findUserByEmail(attributes.user_email);

    if (!user) return;

    // Update status but keep plan as pro until it actually expires
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'cancelled',
        subscriptionEndsAt: attributes.ends_at ? new Date(attributes.ends_at) : null,
      },
    });

    this.logger.log(`Subscription cancelled for user ${user.email}, expires at ${attributes.ends_at}`);
  }

  /**
   * Handle subscription expiration
   */
  private async handleSubscriptionExpired(event: LemonSqueezyWebhookEvent): Promise<void> {
    const { attributes } = event.data;
    const user = await this.findUserByEmail(attributes.user_email);

    if (!user) return;

    // Downgrade to free plan
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        plan: 'free',
        subscriptionStatus: 'expired',
        subscriptionEndsAt: null,
      },
    });

    // Cancel subscription credits
    await this.creditsService.cancelSubscriptionCredits(user.id);

    this.logger.log(`Subscription expired for user ${user.email}`);
  }

  /**
   * Handle successful subscription payment (renewal)
   */
  private async handleSubscriptionPaymentSuccess(event: LemonSqueezyWebhookEvent): Promise<void> {
    const { attributes } = event.data;
    const user = await this.findUserByEmail(attributes.user_email);

    if (!user) return;

    // Update subscription status
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'active',
        subscriptionEndsAt: attributes.renews_at ? new Date(attributes.renews_at) : null,
      },
    });

    // Grant new subscription credits
    const endsAt = attributes.renews_at
      ? new Date(attributes.renews_at)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.creditsService.grantSubscriptionCredits(user.id, endsAt);

    this.logger.log(`Subscription payment succeeded for user ${user.email}`);
  }

  /**
   * Handle failed subscription payment
   */
  private async handleSubscriptionPaymentFailed(event: LemonSqueezyWebhookEvent): Promise<void> {
    const { attributes } = event.data;
    const user = await this.findUserByEmail(attributes.user_email);

    if (!user) return;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'past_due',
      },
    });

    this.logger.log(`Subscription payment failed for user ${user.email}`);
  }

  /**
   * Handle order created (for credit pack purchases)
   */
  private async handleOrderCreated(event: LemonSqueezyWebhookEvent): Promise<void> {
    const { attributes } = event.data;
    const userId = event.meta.custom_data?.user_id;

    // Try to find user by custom_data first, then by email
    let user = userId
      ? await this.prisma.user.findUnique({ where: { id: userId } })
      : null;

    if (!user) {
      user = await this.findUserByEmail(attributes.user_email);
    }

    if (!user) {
      this.logger.warn(`User not found for order: ${event.data.id}`);
      return;
    }

    // Check if this is a credit pack purchase
    const variantId = attributes.variant_id;
    if (variantId && CREDIT_PACKS[variantId]) {
      const pack = CREDIT_PACKS[variantId];
      await this.creditsService.grantPackCredits(
        user.id,
        pack.credits,
        event.data.id,
        pack.name,
      );
      this.logger.log(`Granted ${pack.credits} pack credits to user ${user.email}`);
    }
  }

  /**
   * Find user by email
   */
  private async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * Create a checkout URL for subscription upgrade
   */
  async createCheckoutUrl(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const storeId = this.configService.get<string>('LEMONSQUEEZY_STORE_ID');
    const variantId = this.configService.get<string>('LEMONSQUEEZY_PRO_VARIANT_ID');

    if (!storeId || !variantId) {
      throw new BadRequestException('LemonSqueezy not configured');
    }

    // Build checkout URL with prefilled email and custom data
    const checkoutUrl = new URL(`https://app.lemonsqueezy.com/checkout/buy/${variantId}`);
    checkoutUrl.searchParams.set('checkout[email]', user.email);
    checkoutUrl.searchParams.set('checkout[custom][user_id]', user.id);

    return checkoutUrl.toString();
  }

  /**
   * Create a customer portal URL for managing subscription
   */
  async createCustomerPortalUrl(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.lemonSqueezyCustomerId) {
      throw new BadRequestException('No subscription found');
    }

    // LemonSqueezy customer portal URL
    const storeId = this.configService.get<string>('LEMONSQUEEZY_STORE_ID');
    return `https://app.lemonsqueezy.com/my-orders?store=${storeId}`;
  }

  /**
   * Cancel subscription (at end of billing period)
   */
  async cancelSubscription(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.lemonSqueezySubscriptionId) {
      throw new BadRequestException('No active subscription');
    }

    const apiKey = this.configService.get<string>('LEMONSQUEEZY_API_KEY');
    if (!apiKey) {
      throw new BadRequestException('LemonSqueezy not configured');
    }

    // Call LemonSqueezy API to cancel subscription
    const response = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${user.lemonSqueezySubscriptionId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Failed to cancel subscription: ${error}`);
      throw new BadRequestException('Failed to cancel subscription');
    }

    // Update local status (webhook will also fire)
    await this.prisma.user.update({
      where: { id: userId },
      data: { subscriptionStatus: 'cancelled' },
    });

    this.logger.log(`Subscription cancellation initiated for user ${user.email}`);
  }

  /**
   * Get subscription info for a user
   */
  async getSubscriptionInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
        lemonSqueezySubscriptionId: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return {
      plan: user.plan,
      status: user.subscriptionStatus,
      endsAt: user.subscriptionEndsAt,
      hasSubscription: !!user.lemonSqueezySubscriptionId,
    };
  }
}
