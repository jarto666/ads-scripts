'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Shield,
  Crown,
  Mail,
  Calendar,
  Coins,
  Plus,
  Gift,
  Sparkles,
  Package,
  Clock,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import {
  useAdminControllerGetUserDetail,
  adminControllerGrantCredits,
} from '@/api/generated/api';
import type { GrantCreditsDtoCreditType } from '@/api/generated/models';

// Proper types for credit data (generated types are incorrect)
interface CreditBalance {
  type: 'free' | 'subscription' | 'pack';
  balance: number;
  expiresAt: string | null;
}

interface CreditTransaction {
  id: string;
  creditType: 'free' | 'subscription' | 'pack';
  amount: number;
  balanceAfter: number;
  type: string;
  description: string | null;
  createdAt: string;
}

interface UserDetail {
  id: string;
  email: string;
  isAdmin: boolean;
  plan: string;
  createdAt: string;
  subscriptionStatus?: string;
  subscriptionEndsAt?: string;
  _count: { projects: number };
  creditBalances: CreditBalance[];
  recentTransactions: CreditTransaction[];
}

const CREDIT_TYPE_CONFIG = {
  free: {
    label: 'Free',
    icon: Gift,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    description: 'Monthly free credits, reset each billing cycle',
  },
  subscription: {
    label: 'Subscription',
    icon: Sparkles,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
    description: 'Credits from active subscription plan',
  },
  pack: {
    label: 'Pack',
    icon: Package,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    description: 'Purchased credit packs, never expire',
  },
};

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const userId = params.id as string;

  const [selectedCreditType, setSelectedCreditType] = useState<GrantCreditsDtoCreditType>('free');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDescription, setCreditDescription] = useState('');
  const [isGranting, setIsGranting] = useState(false);

  const { data: response, isLoading, error, refetch } = useAdminControllerGetUserDetail(userId);
  const user = response?.data as unknown as UserDetail | undefined;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) <= new Date();
  };

  const getExpiryStatus = (expiresAt: string | null) => {
    if (!expiresAt) return { text: 'Never expires', variant: 'success' as const };
    const expiry = new Date(expiresAt);
    const now = new Date();
    if (expiry <= now) return { text: 'Expired', variant: 'destructive' as const };
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 7) return { text: `Expires in ${daysLeft}d`, variant: 'warning' as const };
    return { text: `Expires ${formatDate(expiresAt)}`, variant: 'outline' as const };
  };

  const handleGrantCredits = async () => {
    const amount = parseInt(creditAmount);
    if (!amount || amount < 1) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid credit amount',
        variant: 'destructive',
      });
      return;
    }

    setIsGranting(true);
    try {
      await adminControllerGrantCredits(userId, {
        creditType: selectedCreditType,
        amount,
        description: creditDescription || undefined,
      });

      toast({
        title: 'Credits granted',
        description: `Added ${amount} ${selectedCreditType} credits`,
      });

      setCreditAmount('');
      setCreditDescription('');
      refetch();
    } catch {
      toast({
        title: 'Failed to grant credits',
        description: 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsGranting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">User not found</h2>
        <Button variant="outline" onClick={() => router.push('/admin')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin
        </Button>
      </div>
    );
  }

  const totalCredits = user.creditBalances.reduce((sum, b) => {
    if (isExpired(b.expiresAt)) return sum;
    return sum + b.balance;
  }, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/admin')}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground truncate">
              {user.email}
            </h1>
            {user.isAdmin && (
              <Badge variant="default" className="gap-1">
                <Shield className="h-3 w-3" />
                Admin
              </Badge>
            )}
            {user.plan === 'pro' && (
              <Badge variant="warning" className="gap-1">
                <Crown className="h-3 w-3" />
                Pro
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Joined {formatDate(user.createdAt)}
            </span>
            <span>{user._count.projects} projects</span>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 border border-border">
          <Coins className="h-6 w-6 text-primary" />
          <div>
            <p className="text-2xl font-bold">{totalCredits}</p>
            <p className="text-xs text-muted-foreground">Total Credits</p>
          </div>
        </div>
      </div>

      {/* Credit Balances */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          Credit Balances
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {(['free', 'subscription', 'pack'] as const).map((type) => {
            const config = CREDIT_TYPE_CONFIG[type];
            const Icon = config.icon;
            const balance = user.creditBalances.find((b) => b.type === type);
            const expired = balance ? isExpired(balance.expiresAt) : false;
            const expiryStatus = balance ? getExpiryStatus(balance.expiresAt) : null;

            return (
              <Card
                key={type}
                className={`relative overflow-hidden transition-all duration-300 ${
                  expired ? 'opacity-60' : ''
                }`}
              >
                <div
                  className={`absolute inset-0 opacity-30 ${config.bgColor}`}
                  style={{
                    background: `radial-gradient(circle at top right, ${
                      type === 'free'
                        ? 'oklch(0.7 0.17 145 / 0.15)'
                        : type === 'subscription'
                        ? 'oklch(0.75 0.18 195 / 0.15)'
                        : 'oklch(0.75 0.15 80 / 0.15)'
                    } 0%, transparent 70%)`,
                  }}
                />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-lg ${config.bgColor} ${config.borderColor} border`}
                      >
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <CardTitle className="text-base">{config.label}</CardTitle>
                    </div>
                    {expiryStatus && (
                      <Badge variant={expiryStatus.variant} className="text-xs">
                        {expiryStatus.text}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p
                    className={`text-3xl font-bold ${
                      expired ? 'text-muted-foreground line-through' : config.color
                    }`}
                  >
                    {balance?.balance ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {config.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Grant Credits Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Grant Credits
          </CardTitle>
          <CardDescription>
            Add credits to this user&apos;s account. Free and subscription credits
            expire at the end of next month. Pack credits never expire.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Credit Type</Label>
              <Select
                value={selectedCreditType}
                onValueChange={(v) => setSelectedCreditType(v as GrantCreditsDtoCreditType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['free', 'subscription', 'pack'] as const).map((type) => {
                    const config = CREDIT_TYPE_CONFIG[type];
                    const Icon = config.icon;
                    return (
                      <SelectItem key={type} value={type}>
                        <span className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${config.color}`} />
                          {config.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min="1"
                placeholder="100"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description (optional)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Compensation for issue #123"
                  value={creditDescription}
                  onChange={(e) => setCreditDescription(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleGrantCredits}
                  disabled={!creditAmount || isGranting}
                  className="shrink-0"
                >
                  {isGranting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Grant
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Recent Transactions
          </CardTitle>
          <CardDescription>
            Last 20 credit transactions for this user
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user.recentTransactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No transactions yet
            </p>
          ) : (
            <div className="space-y-2">
              {user.recentTransactions.map((tx) => {
                const config = CREDIT_TYPE_CONFIG[tx.creditType];
                const Icon = config.icon;
                const isPositive = tx.amount > 0;

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border hover:border-border/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                          isPositive ? 'bg-success/10' : 'bg-destructive/10'
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp className="h-4 w-4 text-success" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {tx.description || tx.type}
                          </span>
                          <Badge variant="outline" className="text-xs gap-1">
                            <Icon className={`h-3 w-3 ${config.color}`} />
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(tx.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-mono font-semibold ${
                          isPositive ? 'text-success' : 'text-destructive'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {tx.amount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Balance: {tx.balanceAfter}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
