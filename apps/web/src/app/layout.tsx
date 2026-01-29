import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from '@/lib/query-client';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://klippli.com'),
  title: {
    default: 'Klippli - AI UGC Script Generator for TikTok, Reels & Shorts',
    template: '%s | Klippli',
  },
  description:
    'Generate scroll-stopping UGC video scripts in seconds. AI-powered hooks, storyboards, and filming checklists for TikTok, Instagram Reels, and YouTube Shorts. Start free.',
  keywords: [
    'UGC scripts',
    'TikTok scripts',
    'Instagram Reels scripts',
    'YouTube Shorts scripts',
    'AI script generator',
    'video script generator',
    'content creator tools',
    'UGC content',
    'viral video scripts',
    'storyboard generator',
    'short form video',
    'social media scripts',
  ],
  authors: [{ name: 'Klippli' }],
  creator: 'Klippli',
  publisher: 'Klippli',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Klippli',
    title: 'Klippli - AI UGC Script Generator for TikTok, Reels & Shorts',
    description:
      'Generate scroll-stopping UGC video scripts in seconds. AI-powered hooks, storyboards, and filming checklists. Start free.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Klippli - AI UGC Script Generator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Klippli - AI UGC Script Generator',
    description:
      'Generate scroll-stopping UGC video scripts in seconds. AI-powered hooks, storyboards, and filming checklists.',
    images: ['/og-image.png'],
    creator: '@klippli',
  },
  alternates: {
    canonical: '/',
  },
  category: 'Technology',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0e14' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark" translate="no">
      <head>
        <meta name="google" content="notranslate" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.className} min-h-full`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
