"use client";

import { useState } from "react";
import {
  Check,
  Crown,
  Sparkles,
  Zap,
  Package,
  Loader2,
  AlertTriangle,
  Calendar,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth";
import { Credits } from "@/components/ui/credits";
import {
  useCreditsControllerGetBalances,
  useBillingControllerCreateCheckout,
  useBillingControllerGetSubscription,
  useBillingControllerCancelSubscription,
} from "@/api/generated/api";
import { useMutation } from "@tanstack/react-query";
import { customInstance } from "@/api/customInstance";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

// Format date as "1st Dec 2025"
function formatDate(date: string | Date): string {
  const d = new Date(date);
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const year = d.getFullYear();

  const suffix =
    day === 1 || day === 21 || day === 31
      ? "st"
      : day === 2 || day === 22
        ? "nd"
        : day === 3 || day === 23
          ? "rd"
          : "th";

  return `${day}${suffix} ${month} ${year}`;
}

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    credits: 20,
    period: "month",
    description: "Perfect for trying out the platform",
    features: [
      "20 credits/month",
      "Standard & Premium quality",
      "All script angles",
      "All platforms",
      "PDF export",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 12,
    credits: 200,
    period: "month",
    description: "For serious content creators",
    features: [
      "Everything in Free, plus:",
      "200 credits/month",
      "PDF & CSV export",
      "Priority generation",
      "Credit pack purchases",
    ],
    recommended: true,
  },
];

const CREDIT_PACKS = [
  {
    id: "starter",
    name: "Starter Pack",
    credits: 100,
    price: 8,
    pricePerCredit: 0.08,
  },
  {
    id: "growth",
    name: "Growth Pack",
    credits: 250,
    price: 18,
    pricePerCredit: 0.072,
  },
  {
    id: "agency",
    name: "Agency Pack",
    credits: 500,
    price: 30,
    pricePerCredit: 0.06,
    popular: true,
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Fetch credits and subscription data
  const { data: creditsData, isLoading: creditsLoading } =
    useCreditsControllerGetBalances();
  const { data: subscriptionData, refetch: refetchSubscription } =
    useBillingControllerGetSubscription();

  const checkoutMutation = useBillingControllerCreateCheckout();
  const cancelMutation = useBillingControllerCancelSubscription();
  const resumeMutation = useMutation({
    mutationFn: async () => {
      return customInstance("/billing/subscription/resume", { method: "POST" });
    },
    onSuccess: () => {
      refetchSubscription();
      toast({
        title: "Subscription resumed",
        description: "Your subscription has been reactivated.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to resume subscription",
      });
    },
  });

  const balances = creditsData?.data?.balances ?? [];
  const totalCredits = creditsData?.data?.total ?? 0;

  const freeBalance = balances.find((b) => b.type === "free");
  const subBalance = balances.find((b) => b.type === "subscription");
  const packBalance = balances.find((b) => b.type === "pack");

  const subscription = subscriptionData?.data as
    | (NonNullable<typeof subscriptionData>["data"] & { canResume?: boolean })
    | undefined;
  const isPro = user?.plan === "pro";
  const isAdmin = user?.isAdmin;
  const showPacks = isPro || isAdmin;
  const isCancelled = subscription?.status === "cancelled";
  const canResume = (subscription as { canResume?: boolean })?.canResume ?? false;

  const handleUpgrade = async () => {
    setIsLoading("pro");
    try {
      const result = await checkoutMutation.mutateAsync();
      // Redirect to LemonSqueezy checkout
      if (result.data?.url) {
        window.location.href = result.data.url;
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create checkout session",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await cancelMutation.mutateAsync();
      await refetchSubscription();
      toast({
        title: "Subscription cancelled",
        description:
          "Your subscription will remain active until the end of the billing period.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to cancel subscription",
      });
    }
  };

  const handleBuyPack = async (packId: string) => {
    // Map pack IDs to API size parameter
    const packSizeMap: Record<string, string> = {
      starter: "small",
      growth: "medium",
      agency: "large",
    };
    const size = packSizeMap[packId];
    if (!size) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid pack selected",
      });
      return;
    }

    setIsLoading(packId);
    try {
      const result = await customInstance<{ data: { url: string } }>(
        `/billing/checkout/pack/${size}`,
        { method: "POST" }
      );
      if (result.data?.url) {
        window.location.href = result.data.url;
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create checkout session",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const renderPlans = () => (
    <div
      className={cn(
        "grid md:grid-cols-2 gap-8 items-start animate-fade-up",
        isPro ? "stagger-4" : "stagger-3"
      )}
    >
      {PLANS.map((plan) => {
        const isCurrent =
          (plan.id === "free" && !isPro) || (plan.id === "pro" && isPro);
        const isProPlan = plan.id === "pro";

        return (
          <div
            key={plan.id}
            className={cn(
              "relative rounded-2xl transition-all duration-300",
              isProPlan
                ? "gradient-border p-px"
                : "border border-border bg-card/50"
            )}
          >
            <div
              className={cn(
                "h-full rounded-2xl p-8 flex flex-col",
                isProPlan ? "bg-card/95 backdrop-blur-xl" : ""
              )}
            >
              {plan.recommended && !isPro && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary hover:bg-primary text-primary-foreground px-4 py-1 shadow-glow">
                    Most Popular
                  </Badge>
                </div>
              )}

              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={cn(
                      "p-3 rounded-xl w-fit",
                      isProPlan
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {isProPlan ? (
                      <Crown className="h-6 w-6" />
                    ) : (
                      <Sparkles className="h-6 w-6" />
                    )}
                  </div>
                  {isCurrent && (
                    <Badge variant="secondary" className="bg-secondary/80">
                      Current Plan
                    </Badge>
                  )}
                </div>

                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold tracking-tight">
                    ${plan.price}
                  </span>
                  <span className="text-muted-foreground">/{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-1 rounded-full p-0.5",
                        isProPlan
                          ? "bg-primary/20 text-primary"
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {isProPlan ? (
                isPro ? (
                  <Button className="w-full" variant="outline" disabled>
                    Currently Active
                  </Button>
                ) : (
                  <Button
                    className="w-full btn-glow bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-base"
                    onClick={handleUpgrade}
                    disabled={isLoading === "pro"}
                  >
                    {isLoading === "pro" && (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    )}
                    Upgrade to Pro
                  </Button>
                )
              ) : (
                <Button variant="outline" className="w-full h-12" disabled>
                  {isCurrent ? "Currently Active" : "Free Plan"}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderCreditPacks = () =>
    showPacks && (
      <div
        className={cn(
          "space-y-8 animate-fade-up pt-12 border-t border-border/50",
          isPro ? "stagger-3" : "stagger-4"
        )}
      >
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">Need More Credits?</h2>
          <p className="text-muted-foreground">
            Top up your account with credit packs. They never expire.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {CREDIT_PACKS.map((pack) => (
            <Card
              key={pack.id}
              className={cn(
                "relative overflow-hidden transition-all duration-300 hover:border-primary/50",
                pack.popular ? "border-primary/50 bg-primary/5" : "bg-card/50"
              )}
            >
              {pack.popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-xl">
                  BEST VALUE
                </div>
              )}
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  {pack.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">${pack.price}</span>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50 border border-border/50">
                  <Zap className="h-4 w-4 text-warning" />
                  <span className="font-bold">{pack.credits} Credits</span>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  ${pack.pricePerCredit.toFixed(3)} per credit
                </p>

                <Button
                  variant={pack.popular ? "default" : "outline"}
                  className={cn("w-full", pack.popular && "btn-glow")}
                  onClick={() => handleBuyPack(pack.id)}
                  disabled={isLoading === pack.id}
                >
                  {isLoading === pack.id && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Buy Pack
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );

  return (
    <div className="space-y-12 max-w-6xl mx-auto pb-20">
      {/* Hero Section */}
      <div className="text-center space-y-4 pt-8 animate-fade-up">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          <span className="gradient-text">Simple, Transparent Pricing</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {isPro
            ? "Manage your subscription and top up credits instantly."
            : "Start creating viral scripts for free. Upgrade when you're ready to scale."}
        </p>
      </div>

      {/* Credits Dashboard - Only for logged in users */}
      {user && (
        <div className="animate-fade-up stagger-1">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Total Credits */}
            <div className="stat-card md:col-span-1 flex flex-col justify-between group">
              <div>
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                  <Zap className="h-4 w-4 text-warning" />
                  <span className="text-sm font-medium">Total Balance</span>
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {creditsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    totalCredits
                  )}
                </div>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                Available to use now
              </div>
            </div>

            {/* Breakdown */}
            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Free */}
              <div className="glass rounded-xl p-5 border border-border/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <Sparkles className="h-12 w-12" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant="outline"
                    className="bg-background/50 backdrop-blur-sm"
                  >
                    Free
                  </Badge>
                </div>
                <div className="text-2xl font-bold mb-1">
                  {freeBalance?.effectiveBalance ?? 0}
                </div>
                {freeBalance?.expiresAt ? (
                  <p className="text-xs text-muted-foreground">
                    Resets {formatDate(freeBalance.expiresAt)}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Monthly allowance
                  </p>
                )}
              </div>

              {/* Subscription */}
              <div className="glass rounded-xl p-5 border border-border/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <Crown className="h-12 w-12" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "backdrop-blur-sm",
                      isPro
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-background/50"
                    )}
                  >
                    Subscription
                  </Badge>
                </div>
                <div className="text-2xl font-bold mb-1">
                  {subBalance?.effectiveBalance ?? 0}
                </div>
                {isPro && subBalance?.expiresAt ? (
                  <p className="text-xs text-muted-foreground">
                    Renews {formatDate(subBalance.expiresAt)}
                  </p>
                ) : isPro ? (
                  <p className="text-xs text-muted-foreground">
                    Pro subscription
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Upgrade to Pro and get 200 credits monthly
                  </p>
                )}
              </div>

              {/* Packs */}
              <div className="glass rounded-xl p-5 border border-border/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <Package className="h-12 w-12" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant="outline"
                    className="bg-background/50 backdrop-blur-sm"
                  >
                    Packs
                  </Badge>
                </div>
                <div className="text-2xl font-bold mb-1">
                  {packBalance?.effectiveBalance ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Never expires</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Status for Pro Users */}
      {isPro && subscription && (
        <div className="animate-fade-up stagger-2">
          <div
            className={cn(
              "rounded-xl p-6 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
              isCancelled
                ? "bg-warning/5 border-warning/20"
                : "bg-success/5 border-success/20"
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "h-12 w-12 rounded-full flex items-center justify-center shrink-0",
                  isCancelled
                    ? "bg-warning/10 text-warning"
                    : "bg-success/10 text-success"
                )}
              >
                {isCancelled ? (
                  <AlertTriangle className="h-6 w-6" />
                ) : (
                  <ShieldCheck className="h-6 w-6" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {isCancelled
                    ? "Cancellation Pending"
                    : "Pro Subscription Active"}
                </h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {isCancelled ? "Access until" : "Next billing date:"}{" "}
                  <span className="font-medium text-foreground">
                    {subscription.endsAt && formatDate(subscription.endsAt)}
                  </span>
                </p>
              </div>
            </div>

            {isCancelled && canResume ? (
              <Button
                onClick={() => resumeMutation.mutate()}
                disabled={resumeMutation.isPending}
                className="btn-glow"
              >
                {resumeMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Resume Subscription
              </Button>
            ) : !isCancelled ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    Cancel Subscription
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your subscription will remain active until the end of the
                      current billing period. You will not be charged again, but
                      you will lose access to Pro features after this date.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancelSubscription}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {cancelMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Cancel Subscription
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
        </div>
      )}

      {/* Main Sections - Conditional Ordering */}
      {isPro ? (
        <>
          {renderCreditPacks()}
          {renderPlans()}
        </>
      ) : (
        <>
          {renderPlans()}
          {renderCreditPacks()}
        </>
      )}

      {/* FAQ / Support */}
      <div className="animate-fade-up stagger-5 pt-12">
        <div className="glass rounded-2xl p-8 text-center space-y-4">
          <h3 className="text-xl font-semibold">
            Have questions about pricing?
          </h3>
          <p className="text-muted-foreground max-w-xl mx-auto">
            We're here to help. If you have specific requirements or need a
            custom plan for your agency, get in touch with us.
          </p>
          <Button variant="outline" className="mt-4">
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  );
}
