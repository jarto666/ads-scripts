"use client";

import { useState } from "react";
import { Check, Crown, Sparkles, Zap, CreditCard, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth";
import { Credits } from "@/components/ui/credits";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    credits: 20,
    period: "month",
    description: "Perfect for trying out the platform",
    features: [
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
      "Standard & Premium quality",
      "All script angles",
      "All platforms",
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

  const isPro = user?.plan === "pro";
  const isAdmin = user?.isAdmin;
  const showPacks = isPro || isAdmin;

  const handleUpgrade = async () => {
    setIsLoading("pro");
    // TODO: Implement Stripe checkout
    toast({
      title: "Coming soon",
      description: "Payment integration will be available soon.",
    });
    setIsLoading(null);
  };

  const handleManageSubscription = async () => {
    setIsLoading("manage");
    // TODO: Implement Stripe customer portal
    toast({
      title: "Coming soon",
      description: "Subscription management will be available soon.",
    });
    setIsLoading(null);
  };

  const handleBuyPack = async (packId: string) => {
    setIsLoading(packId);
    // TODO: Implement pack purchase
    toast({
      title: "Coming soon",
      description: "Credit pack purchases will be available soon.",
    });
    setIsLoading(null);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">
          {isPro ? "Manage Your Subscription" : "Choose Your Plan"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {isPro
            ? "You are currently on the Pro plan"
            : "Start free and upgrade when you need more"}
        </p>
      </div>

      {/* Current Credits Display */}
      {user && (
        <Card className="bg-secondary/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-warning/15">
                  <Zap className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Your Credits
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isPro
                      ? "Resets on billing date"
                      : "Resets on 1st of month"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Credits amount={20} size="lg" className="text-foreground" />
                <p className="text-xs text-muted-foreground">
                  of {isPro ? "200" : "20"} monthly
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credit Packs - Only for Pro or Admin (shown first) */}
      {showPacks && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">Credit Packs</h2>
            <p className="text-muted-foreground mt-1">
              Need more credits? Purchase additional packs anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {CREDIT_PACKS.map((pack) => (
              <Card
                key={pack.id}
                className={`relative ${
                  pack.popular
                    ? "border-primary shadow-lg shadow-primary/10"
                    : ""
                }`}
              >
                {pack.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground text-[10px]">
                      Best Value
                    </Badge>
                  </div>
                )}
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">{pack.name}</span>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <Credits amount={pack.credits} size="lg" />
                    <span className="text-muted-foreground">credits</span>
                  </div>

                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold">${pack.price}</span>
                  </div>

                  <p className="text-xs text-muted-foreground mb-4">
                    ${pack.pricePerCredit.toFixed(3)} per credit
                  </p>

                  <Button
                    variant={pack.popular ? "default" : "outline"}
                    className="w-full"
                    onClick={() => handleBuyPack(pack.id)}
                    disabled={isLoading === pack.id}
                  >
                    Buy Pack
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Pack credits are added to your balance immediately and never expire.
          </p>
        </div>
      )}

      {/* Plans */}
      <div className="space-y-6">
        {showPacks && (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">
              Subscription Plans
            </h2>
            <p className="text-muted-foreground mt-1">
              Change your plan or manage your subscription.
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {PLANS.map((plan) => {
            const isCurrent =
              (plan.id === "free" && !isPro) || (plan.id === "pro" && isPro);

            return (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.recommended && !isPro
                    ? "border-primary shadow-lg shadow-primary/10"
                    : ""
                }`}
              >
                {plan.recommended && !isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      Recommended
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {plan.id === "pro" ? (
                      <Crown className="h-5 w-5 text-warning" />
                    ) : (
                      <Sparkles className="h-5 w-5 text-primary" />
                    )}
                    <CardTitle>{plan.name}</CardTitle>
                    {isCurrent && (
                      <Badge variant="secondary" className="ml-auto">
                        Current
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">
                      /{plan.period}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                    <Credits amount={plan.credits} />
                    <span className="text-sm text-muted-foreground">
                      credits per month
                    </span>
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-success shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.id === "pro" ? (
                    isPro ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleManageSubscription}
                        disabled={isLoading === "manage"}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Manage Subscription
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={handleUpgrade}
                        disabled={isLoading === "pro"}
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        Upgrade to Pro
                      </Button>
                    )
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      {isCurrent ? "Current Plan" : "Downgrade"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* FAQ or Help */}
      <Card className="bg-secondary/30">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Questions about pricing?</p>
              <p className="text-sm text-muted-foreground">
                Contact us for enterprise plans or custom needs.
              </p>
            </div>
            <Button variant="outline">Contact Us</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
