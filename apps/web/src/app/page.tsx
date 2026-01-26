'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Video,
  FileText,
  CheckCircle2,
  ArrowRight,
  Play,
  Target,
  ChevronRight,
  Users,
  TrendingUp,
  Layers,
  Camera,
  MessageSquare,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { authControllerMe, authControllerRequestLink } from '@/api/generated/api';

// Script angles data
const scriptAngles = [
  {
    name: 'Pain Agitation',
    description: 'Hit their pain points hard, then present your solution',
    icon: Target,
  },
  {
    name: 'Transformation',
    description: 'Show the before and after journey',
    icon: TrendingUp,
  },
  {
    name: 'Curiosity Hook',
    description: 'Open loops that demand attention',
    icon: MessageSquare,
  },
  {
    name: 'Objection Reversal',
    description: 'Address doubts before they arise',
    icon: Shield,
  },
];

const platforms = [
  { name: 'TikTok', gradient: 'from-[#ff0050] to-[#00f2ea]' },
  { name: 'Reels', gradient: 'from-[#f58529] via-[#dd2a7b] to-[#8134af]' },
  { name: 'Shorts', gradient: 'from-[#ff0000] to-[#ff4444]' },
];

const features = [
  {
    icon: Sparkles,
    title: 'AI Script Generation',
    description: 'Generate scroll-stopping scripts in seconds using advanced AI that understands viral content patterns.',
  },
  {
    icon: Layers,
    title: '8 Proven Script Angles',
    description: 'Choose from pain agitation, transformation, curiosity hooks, and 5 more battle-tested frameworks.',
  },
  {
    icon: Camera,
    title: 'Shot-by-Shot Storyboards',
    description: 'Get detailed filming instructions, camera angles, and visual directions for every scene.',
  },
  {
    icon: Users,
    title: 'Target Persona Matching',
    description: 'Scripts tailored to your specific audience demographics and psychographics.',
  },
  {
    icon: Video,
    title: 'Platform Optimized',
    description: 'Content specifically tuned for TikTok, Instagram Reels, or YouTube Shorts algorithms.',
  },
  {
    icon: FileText,
    title: 'Export & Share',
    description: 'Download as PDF or CSV. Share with your team or hand directly to creators.',
  },
];

const stats = [
  { value: '200+', label: 'Scripts per month', sublabel: 'On pro plan' },
  { value: '8', label: 'Script angles', sublabel: 'Proven frameworks' },
  { value: '<20s', label: 'Generation time', sublabel: 'Per script' },
];

const howItWorks = [
  {
    step: '01',
    title: 'Describe Your Product',
    description: 'Tell us what you\'re selling and who you\'re targeting. The more context, the better the scripts.',
  },
  {
    step: '02',
    title: 'Choose Your Angle',
    description: 'Select from 8 proven script frameworks. Each designed for a different psychological trigger.',
  },
  {
    step: '03',
    title: 'Generate & Refine',
    description: 'Get your script with hooks, body copy, CTAs, and complete storyboard in seconds.',
  },
];

const faqs = [
  {
    q: 'What platforms do you support?',
    a: 'Klippli generates scripts optimized for TikTok, Instagram Reels, and YouTube Shorts. Each platform has unique content patterns we account for.',
  },
  {
    q: 'How many scripts can I generate?',
    a: 'Free accounts get 20 credits/month (standard quality costs 1 credit). Pro accounts get 200 credits/month plus the ability to buy additional credit packs.',
  },
  {
    q: 'What\'s included in each script?',
    a: 'Every script includes a hook, body copy, CTA, shot-by-shot storyboard, filming directions, and prop suggestions. Premium scripts also include quality scoring.',
  },
  {
    q: 'Can I export my scripts?',
    a: 'Yes! All plans include PDF export. Pro users also get CSV export for bulk operations and easier handoff to creators.',
  },
];

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [mode, setMode] = useState<'request' | 'login'>('login');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const checkAuth = async () => {
      try {
        await authControllerMe();
        router.replace('/dashboard');
      } catch {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: 'Email required',
        description: 'Please enter your email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      await authControllerRequestLink({ email });
      setSubmitted(true);
      toast({
        title: mode === 'login' ? 'Magic link sent' : 'Request submitted',
        description: mode === 'login' ? 'Check your email to sign in.' : 'We\'ll be in touch soon.',
      });
    } catch {
      toast({
        title: 'Error',
        description: mode === 'login' ? 'Failed to send magic link. Please try again.' : 'Failed to submit request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted || isCheckingAuth) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-16 gap-8">
            {/* Logo */}
            <Link href="/" className="group flex items-center gap-2 shrink-0 absolute left-4 sm:left-6 lg:left-8">
              <div className="flex items-baseline">
                <span className="text-xl font-black tracking-tight text-foreground">Klipp</span>
                <span className="text-xl font-black tracking-tight text-primary">li</span>
              </div>
            </Link>

            {/* Nav Links - Centered on page */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                How It Works
              </a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                FAQ
              </a>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-3 shrink-0 absolute right-4 sm:right-6 lg:right-8">
              <Button variant="ghost" size="sm" onClick={() => {
                setMode('login');
                document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' });
              }}>
                Sign In
              </Button>
              <Button size="sm" className="hidden sm:flex" onClick={() => {
                document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' });
              }}>
                Get Started Free
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-1/4 -left-48 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[80px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-up">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered UGC Scripts</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight mb-6 animate-fade-up stagger-1">
              Generate{' '}
              <span className="text-gradient">UGC Scripts</span>
              {' '}with AI
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-up stagger-2">
              Generate scroll-stopping UGC scripts for TikTok, Reels, and Shorts in seconds.
              Complete with hooks, storyboards, and filming checklists.
            </p>

            {/* Platform Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-10 animate-fade-up stagger-2">
              {platforms.map((platform) => (
                <div
                  key={platform.name}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border"
                >
                  <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${platform.gradient}`} />
                  <span className="text-sm font-medium">{platform.name}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up stagger-3">
              <Button
                size="lg"
                className="w-full sm:w-auto h-14 px-8 text-base btn-glow"
                onClick={() => {
                  document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Start Creating Free
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-14 px-8 text-base group"
                onClick={() => {
                  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <Play className="h-5 w-5 mr-2 group-hover:text-primary transition-colors" />
                See How It Works
              </Button>
            </div>

          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-border/50 bg-secondary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl sm:text-5xl font-black text-gradient mb-2">{stat.value}</div>
                <div className="text-lg font-medium text-foreground">{stat.label}</div>
                <div className="text-sm text-muted-foreground">{stat.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Script Angles Preview */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              8 Battle-Tested <span className="text-gradient">Script Angles</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Each framework is designed to trigger specific psychological responses. Pick the right angle for your audience.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {scriptAngles.map((angle, i) => (
              <div
                key={i}
                className="group relative p-6 rounded-2xl bg-card/50 border border-border hover:border-primary/50 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="mb-4 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <angle.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{angle.name}</h3>
                <p className="text-sm text-muted-foreground">{angle.description}</p>
              </div>
            ))}
          </div>

          <p className="text-center mt-8 text-muted-foreground">
            + 4 more angles including Social Proof, Storytelling, Problem-Solution, and Controversial Take
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-28 bg-gradient-to-b from-secondary/30 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
              Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need to{' '}
              <span className="text-gradient">Create Viral Content</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From ideation to filming brief, Klippli handles the creative heavy lifting so you can focus on production.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group relative p-8 rounded-2xl bg-card/30 border border-border hover:border-primary/30 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                <div className="relative">
                  <div className="mb-5 w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
              How It Works
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              From Idea to Script in{' '}
              <span className="text-gradient">3 Simple Steps</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              No more hours spent brainstorming. Get production-ready scripts faster than you can say "viral."
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {howItWorks.map((step, i) => (
              <div key={i} className="text-center md:text-left">
                <div className="text-6xl font-black text-primary/20 mb-4">{step.step}</div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Button
              size="lg"
              className="h-14 px-8 text-base"
              onClick={() => {
                document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Try It Free
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
              Pricing
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Simple, <span className="text-gradient">Transparent Pricing</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start free. Upgrade when you need more power.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="relative p-8 rounded-2xl bg-card/50 border border-border">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Free</h3>
                <p className="text-muted-foreground">Perfect for trying out the platform</p>
              </div>
              <div className="mb-8">
                <span className="text-5xl font-black">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-4 mb-8">
                {['20 credits/month', 'Standard & Premium quality', 'All 8 script angles', 'All platforms', 'PDF export'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                size="lg"
                className="w-full h-12"
                onClick={() => {
                  document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Get Started Free
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="relative p-8 rounded-2xl gradient-border">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground px-4 py-1 shadow-glow">
                  Most Popular
                </Badge>
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Pro</h3>
                <p className="text-muted-foreground">For serious content creators</p>
              </div>
              <div className="mb-8">
                <span className="text-5xl font-black">$12</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-4 mb-8">
                {['Everything in Free, plus:', '200 credits/month', 'Priority generation', 'PDF & CSV export', 'Credit pack purchases'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                size="lg"
                className="w-full h-12 btn-glow"
                onClick={() => {
                  document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Access all features
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>

          <div className="text-center mt-8 text-sm text-muted-foreground space-y-1">
            <p>Free: 20 standard scripts or 4 premium scripts/month</p>
            <p>Pro: 200 standard scripts or 40 premium scripts/month</p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 lg:py-28 bg-gradient-to-b from-secondary/20 to-transparent">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
              FAQ
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">
              Frequently Asked <span className="text-gradient">Questions</span>
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="border border-border rounded-xl overflow-hidden"
              >
                <button
                  className="w-full px-6 py-5 text-left flex items-center justify-between bg-card/30 hover:bg-card/50 transition-colors"
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                >
                  <span className="font-medium pr-4">{faq.q}</span>
                  <ChevronRight
                    className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform ${
                      expandedFaq === i ? 'rotate-90' : ''
                    }`}
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

      {/* Auth Section */}
      <section id="auth-section" className="py-20 lg:py-28">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          {submitted ? (
            <div className="text-center animate-fade-up">
              <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-success/15 border border-success/20 mb-6 mx-auto">
                <CheckCircle2 className="h-10 w-10 text-success" />
              </div>
              <h2 className="text-3xl font-bold mb-3">
                {mode === 'login' ? 'Check your email' : 'Request received'}
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                {mode === 'login' ? (
                  <>
                    We've sent a magic link to{' '}
                    <span className="text-foreground font-medium">{email}</span>
                  </>
                ) : (
                  <>
                    We've received your access request for{' '}
                    <span className="text-foreground font-medium">{email}</span>
                  </>
                )}
              </p>
              <div className="p-5 rounded-xl bg-secondary/50 border border-border mb-6">
                <p className="text-muted-foreground">
                  {mode === 'login'
                    ? 'Click the link in your email to sign in. The link expires in 24 hours.'
                    : 'We\'ll review your request and send you a magic link once approved.'}
                </p>
              </div>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => setSubmitted(false)}
              >
                Use a different email
              </Button>
            </div>
          ) : (
            <div className="text-center animate-fade-up">
              <h2 className="text-3xl font-bold mb-3">
                {mode === 'login' ? 'Welcome back' : 'Get Started Free'}
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                {mode === 'login'
                  ? 'Enter your email to receive a magic link'
                  : 'Create your first script in under 30 seconds'}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="text-left">
                  <Label htmlFor="email" className="text-foreground sr-only">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="h-14 text-base px-5"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-14 text-base btn-glow"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      {mode === 'login' ? 'Sending...' : 'Submitting...'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {mode === 'login' ? 'Send Magic Link' : 'Get Started Free'}
                      <ArrowRight className="h-5 w-5" />
                    </span>
                  )}
                </Button>
              </form>

              <p className="mt-6 text-sm text-muted-foreground">
                {mode === 'login' ? (
                  <>
                    Don't have access?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('request')}
                      className="text-primary hover:underline font-medium"
                    >
                      Request it
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>

              <p className="mt-8 text-xs text-muted-foreground">
                By signing up, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 lg:py-28 bg-gradient-to-t from-primary/10 to-transparent">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Ready to Create <span className="text-gradient">Viral Content</span>?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join thousands of creators and brands using Klippli to generate scroll-stopping UGC scripts.
          </p>
          <Button
            size="lg"
            className="h-14 px-10 text-base btn-glow"
            onClick={() => {
              document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Start Creating Free
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-baseline">
              <span className="text-lg font-black tracking-tight text-foreground">Klipp</span>
              <span className="text-lg font-black tracking-tight text-primary">li</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
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
