'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Crown,
  Sparkles,
  Zap,
  Package,
  ArrowRight,
  ChevronRight,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    credits: 20,
    period: 'month',
    description: 'Perfect for trying out the platform',
    cta: 'Get Started Free',
    features: [
      { text: '20 credits/month', highlight: true },
      { text: 'Standard & Premium quality', highlight: false },
      { text: 'All 8 script angles', highlight: false },
      { text: 'TikTok, Reels & Shorts', highlight: false },
      { text: 'Shot-by-shot storyboards', highlight: false },
      { text: 'PDF export', highlight: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 12,
    credits: 200,
    period: 'month',
    description: 'For serious content creators and agencies',
    cta: 'Upgrade to Pro',
    recommended: true,
    features: [
      { text: '200 credits/month', highlight: true },
      { text: 'Everything in Free, plus:', highlight: false },
      { text: 'Priority generation', highlight: false },
      { text: 'PDF & CSV export', highlight: false },
      { text: 'Credit pack purchases', highlight: false },
      { text: 'Coming soon: Team features', highlight: false },
    ],
  },
];

const CREDIT_PACKS = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 100,
    price: 8,
    pricePerCredit: 0.08,
  },
  {
    id: 'growth',
    name: 'Growth',
    credits: 250,
    price: 18,
    pricePerCredit: 0.072,
  },
  {
    id: 'agency',
    name: 'Agency',
    credits: 500,
    price: 30,
    pricePerCredit: 0.06,
    popular: true,
  },
];

const CREDIT_USAGE = [
  { quality: 'Standard', cost: '1 credit', description: 'Quick scripts with Claude Haiku' },
  { quality: 'Premium', cost: '5 credits', description: 'High-quality scripts with Claude Sonnet' },
];

const faqs = [
  {
    q: 'What is a credit?',
    a: 'Credits are used to generate scripts. Standard quality scripts cost 1 credit, while Premium quality scripts cost 5 credits. Premium scripts use a more advanced AI model and include quality scoring.',
  },
  {
    q: 'Do unused credits roll over?',
    a: 'Free and Pro subscription credits reset monthly (Free on the 1st, Pro on your billing anniversary). Credit packs you purchase never expire and carry over indefinitely.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes! Pro subscriptions can be cancelled at any time. You\'ll keep access until the end of your billing period, and any credit packs you\'ve purchased remain available.',
  },
  {
    q: 'What\'s included in each script?',
    a: 'Every script includes a hook, body copy, CTA, shot-by-shot storyboard with filming directions, camera angles, and prop suggestions. Premium scripts also include quality scores.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'We offer a satisfaction guarantee. If you\'re not happy with the Pro plan within the first 7 days, contact us for a full refund.',
  },
  {
    q: 'Can I use the scripts commercially?',
    a: 'Absolutely. All scripts you generate are yours to use however you want—for your own content, client work, or commercial projects.',
  },
];

export default function PublicPricingPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="group flex items-center gap-2">
              <div className="flex items-baseline">
                <span className="text-xl font-black tracking-tight text-foreground">Klipp</span>
                <span className="text-xl font-black tracking-tight text-primary">li</span>
              </div>
            </Link>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="/#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                How It Works
              </Link>
              <Link href="/pricing" className="text-sm text-foreground font-medium">
                Pricing
              </Link>
              <Link href="/#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                FAQ
              </Link>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/#auth-section">Sign In</Link>
              </Button>
              <Button size="sm" className="hidden sm:flex" asChild>
                <Link href="/#auth-section">Get Started Free</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 lg:pt-40 lg:pb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-1/3 -left-32 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
            Simple Pricing
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6">
            Start Free, <span className="text-gradient">Scale as You Grow</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            No hidden fees. No complicated tiers. Just simple, transparent pricing that scales with your content needs.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {PLANS.map((plan) => {
              const isProPlan = plan.id === 'pro';

              return (
                <div
                  key={plan.id}
                  className={cn(
                    'relative rounded-2xl transition-all duration-300',
                    isProPlan ? 'gradient-border p-px' : 'border border-border'
                  )}
                >
                  <div
                    className={cn(
                      'h-full rounded-2xl p-8 lg:p-10 flex flex-col',
                      isProPlan ? 'bg-card/95 backdrop-blur-xl' : 'bg-card/30'
                    )}
                  >
                    {plan.recommended && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary hover:bg-primary text-primary-foreground px-4 py-1.5 shadow-glow text-sm">
                          <Star className="h-3.5 w-3.5 mr-1.5 fill-current" />
                          Most Popular
                        </Badge>
                      </div>
                    )}

                    {/* Plan Header */}
                    <div className="mb-8">
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className={cn(
                            'p-3 rounded-xl',
                            isProPlan ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                          )}
                        >
                          {isProPlan ? <Crown className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold">{plan.name}</h3>
                          <p className="text-sm text-muted-foreground">{plan.description}</p>
                        </div>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl lg:text-6xl font-black tracking-tight">${plan.price}</span>
                        <span className="text-muted-foreground">/{plan.period}</span>
                      </div>
                    </div>

                    {/* Features */}
                    <ul className="space-y-4 mb-8 flex-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div
                            className={cn(
                              'mt-0.5 rounded-full p-0.5',
                              isProPlan ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
                            )}
                          >
                            <Check className="h-4 w-4" />
                          </div>
                          <span className={cn(feature.highlight && 'font-semibold')}>{feature.text}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <Button
                      size="lg"
                      className={cn(
                        'w-full h-14 text-base',
                        isProPlan && 'btn-glow bg-primary hover:bg-primary/90'
                      )}
                      variant={isProPlan ? 'default' : 'outline'}
                      asChild
                    >
                      <Link href="/#auth-section">
                        {plan.cta}
                        <ArrowRight className="h-5 w-5 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Credit Usage */}
      <section className="py-16 bg-secondary/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              How Credits Work
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Choose between fast Standard scripts or high-quality Premium scripts based on your needs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {CREDIT_USAGE.map((item, i) => (
              <div key={i} className="p-6 rounded-xl bg-card/50 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-lg">{item.quality}</span>
                  <Badge variant="secondary" className="text-base font-bold">
                    {item.cost}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Credit Packs */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
              Pro Only
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Need More Credits?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Pro users can purchase credit packs that never expire. Perfect for busy months or agency work.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {CREDIT_PACKS.map((pack) => (
              <div
                key={pack.id}
                className={cn(
                  'relative p-6 rounded-xl border transition-all duration-300',
                  pack.popular
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border bg-card/30 hover:border-primary/30'
                )}
              >
                {pack.popular && (
                  <div className="absolute -top-3 right-4">
                    <Badge className="bg-primary text-primary-foreground text-xs">Best Value</Badge>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-lg bg-secondary">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="font-semibold text-lg">{pack.name}</span>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-bold">${pack.price}</span>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50 border border-border/50 mb-4">
                  <Zap className="h-4 w-4 text-warning" />
                  <span className="font-bold">{pack.credits} credits</span>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  ${pack.pricePerCredit.toFixed(3)} per credit
                </p>
              </div>
            ))}
          </div>

          <p className="text-center mt-8 text-sm text-muted-foreground">
            Credit packs are available after upgrading to Pro
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-gradient-to-b from-secondary/20 to-transparent">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
              FAQ
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold">
              Pricing Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <button
                  className="w-full px-6 py-5 text-left flex items-center justify-between bg-card/30 hover:bg-card/50 transition-colors"
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                >
                  <span className="font-medium pr-4">{faq.q}</span>
                  <ChevronRight
                    className={cn(
                      'h-5 w-5 text-muted-foreground shrink-0 transition-transform',
                      expandedFaq === i && 'rotate-90'
                    )}
                  />
                </button>
                {expandedFaq === i && (
                  <div className="px-6 py-5 border-t border-border bg-background/50">
                    <p className="text-muted-foreground">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to Create <span className="text-gradient">Better Scripts</span>?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Start with 20 free credits. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base btn-glow" asChild>
              <Link href="/#auth-section">
                Get Started Free
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 text-base" asChild>
              <Link href="/#features">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-baseline">
              <span className="text-lg font-black tracking-tight text-foreground">Klipp</span>
              <span className="text-lg font-black tracking-tight text-primary">li</span>
            </Link>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <Link href="/#features" className="hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="hover:text-foreground transition-colors">
                Pricing
              </Link>
              <Link href="/#faq" className="hover:text-foreground transition-colors">
                FAQ
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
            </div>

            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Klippli. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
