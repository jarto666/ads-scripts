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
      order_number?: number;
      product_id?: number;
      variant_id?: number;
      status: string;
      user_email: string;
      user_name?: string;
      ends_at?: string;
      renews_at?: string;
      subscription_id?: number;
      created_at: string;
      updated_at: string;
      pause?: {
        mode: string;
        resumes_at?: string;
      } | null;
      // For orders
      total?: number;
      refunded?: boolean;
      first_order_item?: {
        product_id: number;
        product_name: string;
        variant_id: number;
        variant_name: string;
      };
    };
  };
}

// Credit pack variant IDs from LemonSqueezy
// Test environment IDs - update for production
const CREDIT_PACK_VARIANTS: Record<string, { name: string; credits: number }> = {
  // Test environment
  '1254961': { name: 'Starter Pack', credits: 100 },
  '1254965': { name: 'Growth Pack', credits: 250 },
  '1254972': { name: 'Agency Pack', credits: 500 },
  // Production environment (add when available)
};

// Pro subscription variant ID
const PRO_SUBSCRIPTION_VARIANTS = ['1254938']; // Test environment

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
    const secret = this.configService.get<string>('LS_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.error('LS_WEBHOOK_SECRET not configured');
      return false;
    }

    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(payload).digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
    } catch {
      return false;
    }
  }

  /**
   * Handle incoming webhook from LemonSqueezy
   */
  async handleWebhook(event: LemonSqueezyWebhookEvent): Promise<void> {
    const eventName = event.meta.event_name;
    this.logger.log(`Processing LemonSqueezy webhook: ${eventName}`);
    this.logger.log(`Webhook payload: ${JSON.stringify(event, null, 2)}`);

    switch (eventName) {
      // Subscription events
      case 'subscription_created':
        await this.handleSubscriptionCreated(event);
        break;

      case 'subscription_updated':
      case 'subscription_resumed':
      case 'subscription_unpaused':
        await this.handleSubscriptionActive(event);
        break;

      case 'subscription_cancelled':
        await this.handleSubscriptionCancelled(event);
        break;

      case 'subscription_expired':
        await this.handleSubscriptionExpired(event);
        break;

      case 'subscription_paused':
        await this.handleSubscriptionPaused(event);
        break;

      case 'subscription_payment_success':
      case 'subscription_payment_recovered':
        await this.handleSubscriptionPaymentSuccess(event);
        break;

      case 'subscription_payment_failed':
        await this.handleSubscriptionPaymentFailed(event);
        break;

      case 'subscription_payment_refunded':
        await this.handleSubscriptionPaymentRefunded(event);
        break;

      case 'subscription_plan_changed':
        await this.handleSubscriptionPlanChanged(event);
        break;

      // Order events (for credit packs)
      case 'order_created':
        await this.handleOrderCreated(event);
        break;

      case 'order_refunded':
        await this.handleOrderRefunded(event);
        break;

      default:
        this.logger.log(`Unhandled webhook event: ${eventName}`);
    }
  }

  /**
   * Handle new subscription created
   */
  private async handleSubscriptionCreated(event: LemonSqueezyWebhookEvent): Promise<void> {
    const { attributes } = event.data;
    const userId = event.meta.custom_data?.user_id;

    this.logger.log(`handleSubscriptionCreated - custom_data: ${JSON.stringify(event.meta.custom_data)}`);
    this.logger.log(`handleSubscriptionCreated - user_id from custom_data: ${userId}`);
    this.logger.log(`handleSubscriptionCreated - user_email: ${attributes.user_email}`);
    this.logger.log(`handleSubscriptionCreated - variant_id: ${attributes.variant_id}`);
    this.logger.log(`handleSubscriptionCreated - subscription_id: ${event.data.id}`);

    // Try to find user by custom_data first, then by email
    let user = userId
      ? await this.prisma.user.findUnique({ where: { id: userId } })
      : null;

    this.logger.log(`handleSubscriptionCreated - user found by id: ${user ? user.email : 'null'}`);

    if (!user) {
      user = await this.findUserByEmail(attributes.user_email);
      this.logger.log(`handleSubscriptionCreated - user found by email: ${user ? user.email : 'null'}`);
    }

    if (!user) {
      this.logger.warn(`User not found for subscription: ${event.data.id}, userId: ${userId}, email: ${attributes.user_email}`);
      return;
    }

    // Update user with subscription info
    // renews_at = next billing date (for active subs), ends_at = cancellation date (when cancelled)
    const nextBillingDate = attributes.renews_at || attributes.ends_at;
    this.logger.log(`handleSubscriptionCreated - updating user ${user.id} to pro plan`);
    this.logger.log(`handleSubscriptionCreated - renews_at: ${attributes.renews_at}, ends_at: ${attributes.ends_at}`);
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        plan: 'pro',
        lemonSqueezyCustomerId: String(attributes.customer_id),
        lemonSqueezySubscriptionId: event.data.id,
        subscriptionStatus: attributes.status,
        subscriptionEndsAt: nextBillingDate ? new Date(nextBillingDate) : null,
      },
    });
    this.logger.log(`handleSubscriptionCreated - user updated: plan=${updatedUser.plan}, status=${updatedUser.subscriptionStatus}, endsAt=${updatedUser.subscriptionEndsAt}`);

    // Grant subscription credits
    const endsAt = attributes.renews_at
      ? new Date(attributes.renews_at)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    this.logger.log(`handleSubscriptionCreated - granting subscription credits, expires: ${endsAt.toISOString()}`);
    await this.creditsService.grantSubscriptionCredits(user.id, endsAt);
    this.logger.log(`Subscription created for user ${user.email}, granted credits successfully`);
  }

  /**
   * Handle subscription activation (resumed, unpaused)
   */
  private async handleSubscriptionActive(event: LemonSqueezyWebhookEvent): Promise<void> {
    const { attributes } = event.data;
    const user = await this.findUserBySubscriptionId(event.data.id);

    if (!user) {
      this.logger.warn(`User not found for subscription: ${event.data.id}`);
      return;
    }

    const nextBillingDate = attributes.renews_at || attributes.ends_at;

    // Update user with subscription info
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        plan: 'pro',
        subscriptionStatus: attributes.status,
        subscriptionEndsAt: nextBillingDate ? new Date(nextBillingDate) : null,
      },
    });

    this.logger.log(`Subscription activated for user ${user.email}`);
  }

  /**
   * Handle subscription cancellation (will expire at end of period)
   */
  private async handleSubscriptionCancelled(event: LemonSqueezyWebhookEvent): Promise<void> {
    const { attributes } = event.data;
    const user = await this.findUserBySubscriptionId(event.data.id);

    if (!user) {
      this.logger.warn(`User not found for subscription: ${event.data.id}`);
      return;
    }

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
   * Handle subscription paused
   */
  private async handleSubscriptionPaused(event: LemonSqueezyWebhookEvent): Promise<void> {
    const { attributes } = event.data;
    const user = await this.findUserBySubscriptionId(event.data.id);

    if (!user) {
      this.logger.warn(`User not found for subscription: ${event.data.id}`);
      return;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'paused',
      },
    });

    this.logger.log(`Subscription paused for user ${user.email}`);
  }

  /**
   * Handle subscription expiration
   */
  private async handleSubscriptionExpired(event: LemonSqueezyWebhookEvent): Promise<void> {
    const user = await this.findUserBySubscriptionId(event.data.id);

    if (!user) {
      this.logger.warn(`User not found for subscription: ${event.data.id}`);
      return;
    }

    // Downgrade to free plan
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        plan: 'free',
        subscriptionStatus: 'expired',
        subscriptionEndsAt: null,
        lemonSqueezySubscriptionId: null,
      },
    });

    // Cancel subscription credits
    await this.creditsService.cancelSubscriptionCredits(user.id);

    this.logger.log(`Subscription expired for user ${user.email}`);
  }

  /**
   * Handle successful subscription payment (renewal or recovery)
   */
  private async handleSubscriptionPaymentSuccess(event: LemonSqueezyWebhookEvent): Promise<void> {
    const { attributes } = event.data;

    // subscription_payment_success has subscription_id in attributes, not data.id
    const subscriptionId = String(attributes.subscription_id || event.data.id);
    this.logger.log(`handleSubscriptionPaymentSuccess - looking for subscription: ${subscriptionId}`);

    const user = await this.findUserBySubscriptionId(subscriptionId);

    if (!user) {
      this.logger.warn(`User not found for subscription: ${subscriptionId}`);
      return;
    }

    const nextBillingDate = attributes.renews_at || attributes.ends_at;

    // Update subscription status
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        plan: 'pro',
        subscriptionStatus: 'active',
        subscriptionEndsAt: nextBillingDate ? new Date(nextBillingDate) : null,
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
    const user = await this.findUserBySubscriptionId(event.data.id);

    if (!user) {
      this.logger.warn(`User not found for subscription: ${event.data.id}`);
      return;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'past_due',
      },
    });

    this.logger.log(`Subscription payment failed for user ${user.email}`);
  }

  /**
   * Handle subscription payment refunded
   */
  private async handleSubscriptionPaymentRefunded(event: LemonSqueezyWebhookEvent): Promise<void> {
    const user = await this.findUserBySubscriptionId(event.data.id);

    if (!user) {
      this.logger.warn(`User not found for subscription: ${event.data.id}`);
      return;
    }

    // Log the refund - credits were already granted, so we don't revoke them
    // The admin can manually adjust if needed
    this.logger.log(`Subscription payment refunded for user ${user.email}`);
  }

  /**
   * Handle subscription plan changed
   */
  private async handleSubscriptionPlanChanged(event: LemonSqueezyWebhookEvent): Promise<void> {
    const { attributes } = event.data;
    const user = await this.findUserBySubscriptionId(event.data.id);

    if (!user) {
      this.logger.warn(`User not found for subscription: ${event.data.id}`);
      return;
    }

    // For now, we only have one plan (pro), so just log this
    this.logger.log(`Subscription plan changed for user ${user.email}, variant: ${attributes.variant_id}`);
  }

  /**
   * Handle order created (for credit pack purchases)
   */
  private async handleOrderCreated(event: LemonSqueezyWebhookEvent): Promise<void> {
    const { attributes } = event.data;
    const userId = event.meta.custom_data?.user_id;

    this.logger.log(`handleOrderCreated - order_id: ${event.data.id}`);
    this.logger.log(`handleOrderCreated - custom_data: ${JSON.stringify(event.meta.custom_data)}`);
    this.logger.log(`handleOrderCreated - user_id from custom_data: ${userId}`);
    this.logger.log(`handleOrderCreated - user_email: ${attributes.user_email}`);
    this.logger.log(`handleOrderCreated - first_order_item: ${JSON.stringify(attributes.first_order_item)}`);
    this.logger.log(`handleOrderCreated - status: ${attributes.status}`);

    // Try to find user by custom_data first, then by email
    let user = userId
      ? await this.prisma.user.findUnique({ where: { id: userId } })
      : null;

    this.logger.log(`handleOrderCreated - user found by id: ${user ? user.email : 'null'}`);

    if (!user) {
      user = await this.findUserByEmail(attributes.user_email);
      this.logger.log(`handleOrderCreated - user found by email: ${user ? user.email : 'null'}`);
    }

    if (!user) {
      this.logger.warn(`User not found for order: ${event.data.id}, userId: ${userId}, email: ${attributes.user_email}`);
      return;
    }

    // Get variant ID from first_order_item or attributes
    const variantId = String(attributes.first_order_item?.variant_id || attributes.variant_id);
    this.logger.log(`handleOrderCreated - variant_id: ${variantId}`);

    // Skip if this is a subscription order (not a credit pack)
    if (PRO_SUBSCRIPTION_VARIANTS.includes(variantId)) {
      this.logger.log(`Order ${event.data.id} is a subscription, skipping credit grant`);
      return;
    }

    // Check if this is a credit pack purchase
    const pack = CREDIT_PACK_VARIANTS[variantId];
    this.logger.log(`handleOrderCreated - pack found: ${pack ? pack.name : 'null'}`);
    if (pack) {
      // Check if we already processed this order (idempotency)
      const existingTransaction = await this.prisma.creditTransaction.findFirst({
        where: { orderId: event.data.id },
      });

      if (existingTransaction) {
        this.logger.log(`Order ${event.data.id} already processed, skipping`);
        return;
      }

      await this.creditsService.grantPackCredits(
        user.id,
        pack.credits,
        event.data.id,
        pack.name,
      );
      this.logger.log(`Granted ${pack.credits} pack credits (${pack.name}) to user ${user.email}`);
    } else {
      this.logger.log(`Unknown variant ${variantId} for order ${event.data.id}`);
    }
  }

  /**
   * Handle order refunded (revoke credits if possible)
   */
  private async handleOrderRefunded(event: LemonSqueezyWebhookEvent): Promise<void> {
    const { attributes } = event.data;

    // Find the credit transaction for this order
    const transaction = await this.prisma.creditTransaction.findFirst({
      where: { orderId: event.data.id },
    });

    if (!transaction) {
      this.logger.log(`No credit transaction found for refunded order ${event.data.id}`);
      return;
    }

    // Log the refund - we don't automatically revoke credits
    // The admin can manually adjust if the user has abused refunds
    this.logger.warn(
      `Order ${event.data.id} refunded. User ${transaction.userId} was granted ${transaction.amount} credits. ` +
      `Manual review may be needed.`
    );

    // Create a note transaction for audit
    await this.prisma.creditTransaction.create({
      data: {
        userId: transaction.userId,
        creditType: transaction.creditType,
        amount: 0,
        balanceAfter: 0,
        type: 'note',
        description: `Order ${event.data.id} was refunded. Original grant: ${transaction.amount} credits.`,
        orderId: `refund-${event.data.id}`,
      },
    });
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
   * Find user by LemonSqueezy subscription ID
   */
  private async findUserBySubscriptionId(subscriptionId: string) {
    return this.prisma.user.findFirst({
      where: { lemonSqueezySubscriptionId: subscriptionId },
    });
  }

  /**
   * Create a checkout URL via LemonSqueezy API
   */
  async createCheckoutUrl(userId: string, variantId?: string, redirectPath?: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const storeId = this.configService.get<string>('LS_STORE_ID');
    const apiKey = this.configService.get<string>('LS_API_KEY');
    const apiBase = this.configService.get<string>('LS_API_BASE') || 'https://api.lemonsqueezy.com/v1';
    const webBaseUrl = this.configService.get<string>('WEB_BASE_URL') || 'http://localhost:3000';

    // Default to Pro subscription variant
    const finalVariantId = variantId || this.configService.get<string>('LS_PRO_VARIANT_ID') || PRO_SUBSCRIPTION_VARIANTS[0];

    if (!finalVariantId || !storeId || !apiKey) {
      throw new BadRequestException('LemonSqueezy not configured');
    }

    const redirectUrl = `${webBaseUrl.replace(/\/$/, '')}${redirectPath || '/settings'}`;

    const payload = {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: user.email,
            custom: { user_id: user.id },
          },
          product_options: {
            redirect_url: redirectUrl,
          },
        },
        relationships: {
          store: { data: { type: 'stores', id: String(storeId) } },
          variant: { data: { type: 'variants', id: String(finalVariantId) } },
        },
      },
    };

    const response = await fetch(`${apiBase}/checkouts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Failed to create checkout: ${error}`);
      throw new BadRequestException('Failed to create checkout');
    }

    const data = await response.json();
    const url = data?.data?.attributes?.url;

    if (!url) {
      throw new BadRequestException('Checkout URL not returned');
    }

    return url;
  }

  /**
   * Create a checkout URL for credit pack purchase
   */
  async createPackCheckoutUrl(userId: string, packSize: 'small' | 'medium' | 'large'): Promise<string> {
    const packVariants: Record<string, string> = {
      small: '1254961',
      medium: '1254965',
      large: '1254972',
    };

    const variantId = packVariants[packSize];
    if (!variantId) {
      throw new BadRequestException('Invalid pack size');
    }

    return this.createCheckoutUrl(userId, variantId, `/pricing?purchased=${packSize}`);
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
    const storeId = this.configService.get<string>('LS_STORE_ID');
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

    const apiKey = this.configService.get<string>('LS_API_KEY');
    const apiBase = this.configService.get<string>('LS_API_BASE') || 'https://api.lemonsqueezy.com/v1';

    if (!apiKey) {
      throw new BadRequestException('LemonSqueezy not configured');
    }

    // Call LemonSqueezy API to cancel subscription
    const response = await fetch(
      `${apiBase}/subscriptions/${user.lemonSqueezySubscriptionId}`,
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

    // Determine if subscription can be resumed (cancelled but not yet expired)
    const canResume =
      user.subscriptionStatus === 'cancelled' &&
      user.lemonSqueezySubscriptionId &&
      user.subscriptionEndsAt &&
      new Date(user.subscriptionEndsAt) > new Date();

    return {
      plan: user.plan,
      status: user.subscriptionStatus,
      endsAt: user.subscriptionEndsAt,
      hasSubscription: !!user.lemonSqueezySubscriptionId,
      canResume,
    };
  }

  /**
   * Resume a cancelled subscription (undo cancellation)
   */
  async resumeSubscription(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.lemonSqueezySubscriptionId) {
      throw new BadRequestException('No subscription found');
    }

    if (user.subscriptionStatus !== 'cancelled') {
      throw new BadRequestException('Subscription is not cancelled');
    }

    // Check if subscription hasn't expired yet
    if (user.subscriptionEndsAt && new Date(user.subscriptionEndsAt) <= new Date()) {
      throw new BadRequestException('Subscription has already expired. Please create a new subscription.');
    }

    const apiKey = this.configService.get<string>('LS_API_KEY');
    const apiBase = this.configService.get<string>('LS_API_BASE') || 'https://api.lemonsqueezy.com/v1';

    if (!apiKey) {
      throw new BadRequestException('LemonSqueezy not configured');
    }

    // Call LemonSqueezy API to update subscription (remove cancellation)
    const response = await fetch(
      `${apiBase}/subscriptions/${user.lemonSqueezySubscriptionId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
        },
        body: JSON.stringify({
          data: {
            type: 'subscriptions',
            id: user.lemonSqueezySubscriptionId,
            attributes: {
              cancelled: false,
            },
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Failed to resume subscription: ${error}`);
      throw new BadRequestException('Failed to resume subscription');
    }

    // Update local status (webhook will also fire)
    await this.prisma.user.update({
      where: { id: userId },
      data: { subscriptionStatus: 'active' },
    });

    this.logger.log(`Subscription resumed for user ${user.email}`);
  }
}
