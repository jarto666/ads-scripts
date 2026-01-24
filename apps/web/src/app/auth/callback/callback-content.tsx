'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/api';

export function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setError('No token provided');
      return;
    }

    const consumeToken = async () => {
      try {
        await auth.consumeLink(token);
        router.push('/projects');
      } catch (err) {
        setError('Invalid or expired magic link. Please request a new one.');
      }
    };

    consumeToken();
  }, [searchParams, router]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-destructive">
              Authentication Failed
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <a href="/" className="text-primary hover:underline">
              Back to login
            </a>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Signing you in...</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="animate-pulse">Please wait...</div>
        </CardContent>
      </Card>
    </main>
  );
}
