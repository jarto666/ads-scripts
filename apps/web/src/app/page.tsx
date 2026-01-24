'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, ArrowRight, Sparkles, Video, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { auth } from '@/lib/api';

const features = [
  { icon: Sparkles, text: 'AI-powered script generation' },
  { icon: Video, text: 'TikTok, Reels & Shorts optimized' },
  { icon: FileText, text: 'Shot-by-shot storyboards' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

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
      await auth.requestLink(email);
      setLinkSent(true);
      toast({
        title: 'Magic link sent',
        description: 'Check your email for the login link.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send magic link. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/15 border border-primary/20">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-xl text-foreground tracking-tight">Script Factory</h1>
            <p className="text-xs text-muted-foreground">UGC Script Generator</p>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-bold text-foreground leading-tight mb-6">
            Generate scroll-stopping{' '}
            <span className="text-gradient">UGC scripts</span>{' '}
            in seconds
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Create high-converting video scripts for TikTok, Reels, and Shorts. Complete with hooks, storyboards, and filming checklists.
          </p>

          {/* Features */}
          <div className="space-y-4">
            {features.map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-3 animate-fade-up opacity-0"
                style={{ animationDelay: `${i * 0.1}s`, animationFillMode: 'forwards' }}
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 border border-primary/20">
                  <feature.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-foreground">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="relative z-10 flex gap-12">
          <div>
            <p className="text-3xl font-bold text-foreground">50+</p>
            <p className="text-sm text-muted-foreground">Free scripts/month</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">8</p>
            <p className="text-sm text-muted-foreground">Script angles</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">$12</p>
            <p className="text-sm text-muted-foreground">Pro plan/month</p>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 lg:max-w-xl flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/15 border border-primary/20">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-xl text-foreground tracking-tight">Script Factory</h1>
              <p className="text-xs text-muted-foreground">UGC Script Generator</p>
            </div>
          </div>

          {linkSent ? (
            /* Success state */
            <div className="animate-fade-up">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-success/15 border border-success/20 mb-6">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Check your email</h2>
              <p className="text-muted-foreground mb-6">
                We sent a magic link to{' '}
                <span className="text-foreground font-medium">{email}</span>
              </p>
              <div className="p-4 rounded-xl bg-secondary/50 border border-border mb-6">
                <p className="text-sm text-muted-foreground">
                  Click the link in your email to sign in. The link expires in 15 minutes.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setLinkSent(false)}
              >
                Use a different email
              </Button>
            </div>
          ) : (
            /* Login form */
            <div className="animate-fade-up">
              <h2 className="text-2xl font-bold text-foreground mb-2">Welcome back</h2>
              <p className="text-muted-foreground mb-8">
                Sign in to your account to continue
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="h-12"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Send magic link
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground text-center">
                  No password needed. We&apos;ll send you a secure link to sign in.
                </p>
              </div>

              {/* Mobile features */}
              <div className="lg:hidden mt-12 pt-8 border-t border-border">
                <p className="text-sm font-medium text-foreground mb-4">What you get:</p>
                <div className="space-y-3">
                  {features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <feature.icon className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
