import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

const CREDIT_TYPES = ['free', 'subscription', 'pack'] as const;
type CreditType = (typeof CREDIT_TYPES)[number];

const CONSUMPTION_PRIORITY: CreditType[] = ['free', 'subscription', 'pack'];

const FREE_MONTHLY_CREDITS = 20;
const SUBSCRIPTION_MONTHLY_CREDITS = 200;

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get all credit balances for a user
   */
  async getBalances(userId: string) {
    const balances = await this.prisma.creditBalance.findMany({
      where: { userId },
    });

    const now = new Date();
    return balances.map((b) => ({
      type: b.type as CreditType,
      balance: b.balance,
      expiresAt: b.expiresAt,
      isExpired: b.expiresAt ? b.expiresAt <= now : false,
      effectiveBalance: b.expiresAt && b.expiresAt <= now ? 0 : b.balance,
    }));
  }

  /**
   * Get total available (non-expired) credits
   */
  async getTotalAvailable(userId: string): Promise<number> {
    const balances = await this.getBalances(userId);
    return balances.reduce((sum, b) => sum + b.effectiveBalance, 0);
  }

  /**
   * Check if user has enough credits
   */
  async hasEnoughCredits(userId: string, amount: number): Promise<boolean> {
    const total = await this.getTotalAvailable(userId);
    return total >= amount;
  }

  /**
   * Consume credits in priority order: free -> subscription -> pack
   * Returns the breakdown of which credit types were used
   */
  async consume(
    userId: string,
    amount: number,
    batchId?: string,
    description?: string,
  ): Promise<{ success: boolean; breakdown: Record<CreditType, number> }> {
    const balances = await this.prisma.creditBalance.findMany({
      where: { userId },
    });

    const now = new Date();
    let remaining = amount;
    const breakdown: Record<CreditType, number> = { free: 0, subscription: 0, pack: 0 };

    // Calculate total available
    const totalAvailable = balances
      .filter((b) => !b.expiresAt || b.expiresAt > now)
      .reduce((sum, b) => sum + b.balance, 0);

    if (totalAvailable < amount) {
      throw new BadRequestException(
        `Insufficient credits. Need ${amount}, have ${totalAvailable}`,
      );
    }

    // Consume in priority order within a transaction
    await this.prisma.$transaction(async (tx) => {
      for (const type of CONSUMPTION_PRIORITY) {
        if (remaining <= 0) break;

        const balance = balances.find((b) => b.type === type);
        if (!balance) continue;

        // Skip expired balances
        if (balance.expiresAt && balance.expiresAt <= now) continue;

        const deduct = Math.min(balance.balance, remaining);
        if (deduct <= 0) continue;

        const newBalance = balance.balance - deduct;

        await tx.creditBalance.update({
          where: { id: balance.id },
          data: { balance: newBalance },
        });

        // Create ledger entry
        await tx.creditTransaction.create({
          data: {
            userId,
            creditType: type,
            amount: -deduct,
            balanceAfter: newBalance,
            type: 'generation',
            description: description || `Used ${deduct} ${type} credits`,
            batchId,
          },
        });

        breakdown[type as CreditType] = deduct;
        remaining -= deduct;
      }
    });

    return { success: true, breakdown };
  }

  /**
   * Grant credits to a user
   */
  async grant(
    userId: string,
    creditType: CreditType,
    amount: number,
    expiresAt: Date | null,
    type: string,
    description?: string,
    orderId?: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Upsert the balance
      const existing = await tx.creditBalance.findUnique({
        where: { userId_type: { userId, type: creditType } },
      });

      let newBalance: number;

      if (existing) {
        newBalance = existing.balance + amount;
        await tx.creditBalance.update({
          where: { id: existing.id },
          data: {
            balance: newBalance,
            expiresAt: expiresAt ?? existing.expiresAt,
          },
        });
      } else {
        newBalance = amount;
        await tx.creditBalance.create({
          data: {
            userId,
            type: creditType,
            balance: amount,
            expiresAt,
          },
        });
      }

      // Create ledger entry
      await tx.creditTransaction.create({
        data: {
          userId,
          creditType,
          amount,
          balanceAfter: newBalance,
          type,
          description,
          orderId,
        },
      });
    });
  }

  /**
   * Reset free credits (called by cron or manually)
   */
  async resetFreeCredits(userId: string): Promise<void> {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);

    // Check if user was previously deleted (no free credits for re-registered users)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) return;

    const wasDeleted = await this.prisma.deletedUser.findUnique({
      where: { email: user.email },
    });

    const creditAmount = wasDeleted ? 0 : FREE_MONTHLY_CREDITS;

    if (creditAmount === 0) {
      this.logger.log(`Skipping free credits for previously deleted user: ${user.email}`);
      return;
    }

    await this.grant(
      userId,
      'free',
      creditAmount,
      nextMonth,
      'renewal',
      'Monthly free credits',
    );
  }

  /**
   * Grant subscription credits (called when subscription payment succeeds)
   */
  async grantSubscriptionCredits(userId: string, expiresAt: Date): Promise<void> {
    // First, set any existing subscription credits to 0 (they expired with the old period)
    const existing = await this.prisma.creditBalance.findUnique({
      where: { userId_type: { userId, type: 'subscription' } },
    });

    if (existing && existing.balance > 0) {
      // Log expiration of old credits
      await this.prisma.creditTransaction.create({
        data: {
          userId,
          creditType: 'subscription',
          amount: -existing.balance,
          balanceAfter: 0,
          type: 'expire',
          description: 'Subscription credits expired at billing period end',
        },
      });

      await this.prisma.creditBalance.update({
        where: { id: existing.id },
        data: { balance: 0 },
      });
    }

    // Grant new subscription credits
    await this.grant(
      userId,
      'subscription',
      SUBSCRIPTION_MONTHLY_CREDITS,
      expiresAt,
      'renewal',
      'Monthly subscription credits',
    );
  }

  /**
   * Grant pack credits (never expire)
   */
  async grantPackCredits(
    userId: string,
    amount: number,
    orderId: string,
    packName: string,
  ): Promise<void> {
    await this.grant(
      userId,
      'pack',
      amount,
      null, // Pack credits never expire
      'purchase',
      `Purchased ${packName}`,
      orderId,
    );
  }

  /**
   * Initialize credits for a new user
   */
  async initializeNewUser(userId: string, wasDeleted: boolean): Promise<void> {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);

    const creditAmount = wasDeleted ? 0 : FREE_MONTHLY_CREDITS;

    if (creditAmount > 0) {
      await this.grant(
        userId,
        'free',
        creditAmount,
        nextMonth,
        'renewal',
        'Initial free credits',
      );
    }
  }

  /**
   * Cancel subscription credits (when subscription is cancelled/expired)
   */
  async cancelSubscriptionCredits(userId: string): Promise<void> {
    const existing = await this.prisma.creditBalance.findUnique({
      where: { userId_type: { userId, type: 'subscription' } },
    });

    if (existing && existing.balance > 0) {
      await this.prisma.$transaction(async (tx) => {
        await tx.creditTransaction.create({
          data: {
            userId,
            creditType: 'subscription',
            amount: -existing.balance,
            balanceAfter: 0,
            type: 'expire',
            description: 'Subscription cancelled',
          },
        });

        await tx.creditBalance.update({
          where: { id: existing.id },
          data: { balance: 0, expiresAt: new Date() },
        });
      });
    }
  }

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(userId: string, limit = 50) {
    return this.prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Cron job: Reset free credits for all users on 1st of each month
   * Runs daily at midnight and checks if reset is needed
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleFreeCreditsRenewal() {
    this.logger.log('Running daily free credits check...');

    const now = new Date();

    // Find all free credit balances that have expired
    const expiredFreeBalances = await this.prisma.creditBalance.findMany({
      where: {
        type: 'free',
        expiresAt: { lte: now },
      },
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
    });

    this.logger.log(`Found ${expiredFreeBalances.length} users needing free credits renewal`);

    for (const balance of expiredFreeBalances) {
      try {
        await this.resetFreeCredits(balance.userId);
        this.logger.log(`Reset free credits for user ${balance.user.email}`);
      } catch (error) {
        this.logger.error(
          `Failed to reset free credits for user ${balance.userId}: ${error.message}`,
        );
      }
    }

    // Also handle users who don't have any free balance record yet
    const usersWithoutFreeBalance = await this.prisma.user.findMany({
      where: {
        creditBalances: {
          none: { type: 'free' },
        },
      },
      select: { id: true, email: true },
    });

    this.logger.log(
      `Found ${usersWithoutFreeBalance.length} users without free credit balance`,
    );

    for (const user of usersWithoutFreeBalance) {
      try {
        await this.resetFreeCredits(user.id);
        this.logger.log(`Initialized free credits for user ${user.email}`);
      } catch (error) {
        this.logger.error(
          `Failed to initialize free credits for user ${user.id}: ${error.message}`,
        );
      }
    }
  }
}
