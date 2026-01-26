import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Simple, transparent pricing for Klippli. Start free with 20 credits/month. Upgrade to Pro for 200 credits/month at just $12. No hidden fees.',
  openGraph: {
    title: 'Pricing | Klippli',
    description:
      'Simple, transparent pricing for Klippli. Start free with 20 credits/month. Upgrade to Pro for 200 credits/month.',
  },
  alternates: {
    canonical: '/pricing',
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
