/**
 * Shared plan and pricing constants.
 * Used on both landing page and pricing page to ensure consistency.
 */

export interface Plan {
  id: string;
  name: string;
  price: number;
  credits: number;
  period: string;
  description: string;
  features: string[];
  recommended?: boolean;
}

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  pricePerCredit: number;
  popular?: boolean;
}

export const PLANS: { free: Plan; pro: Plan } = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    credits: 20,
    period: 'month',
    description: 'Perfect for trying out the platform',
    features: [
      '20 scripts/month',
      'Pro-grade AI models',
      'All 8 script angles',
      'All platforms',
      'PDF export',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 12,
    credits: 500,
    period: 'month',
    description: 'For serious content creators',
    features: [
      'Everything in Free, plus:',
      '500 scripts/month',
      'AI persona research',
      'URL import with AI analysis',
      'PDF & CSV export',
      'Priority generation',
      'Credit pack purchases',
    ],
    recommended: true,
  },
};

export const PLANS_LIST: Plan[] = [PLANS.free, PLANS.pro];

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'boost',
    name: 'Boost Pack',
    credits: 500,
    price: 18,
    pricePerCredit: 0.036,
  },
  {
    id: 'campaign',
    name: 'Campaign Pack',
    credits: 1000,
    price: 30,
    pricePerCredit: 0.03,
  },
  {
    id: 'agency',
    name: 'Agency Pack',
    credits: 2500,
    price: 60,
    pricePerCredit: 0.024,
    popular: true,
  },
];

/**
 * Credit cost per script (simplified - single tier)
 */
export const CREDIT_COST_PER_SCRIPT = 1;

/**
 * FAQ items shared between pages
 */
export const PRICING_FAQS = [
  {
    q: 'What platforms do you support?',
    a: 'Klippli generates scripts optimized for TikTok, Instagram Reels, and YouTube Shorts. Each platform has unique content patterns we account for.',
  },
  {
    q: 'How many scripts can I generate?',
    a: 'Free accounts get 20 scripts/month. Pro accounts get 500 scripts/month plus the ability to buy additional credit packs that never expire.',
  },
  {
    q: "What's included in each script?",
    a: 'Every script includes a scroll-stopping hook, body copy, CTAs, shot-by-shot storyboard, filming directions, and prop suggestions. All scripts use our best AI models.',
  },
  {
    q: 'Can I export my scripts?',
    a: 'Yes! All plans include PDF export. Pro users also get CSV export for bulk operations and easier handoff to creators.',
  },
] as const;
