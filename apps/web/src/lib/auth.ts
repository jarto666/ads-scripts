'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  useAuthControllerMe,
  useAuthControllerLogout,
  getAuthControllerMeQueryKey,
} from '@/api/generated/api';
import type { UserDto } from '@/api/generated/models';

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useAuthControllerMe({
    query: {
      staleTime: 0, // Always consider stale so refetchOnWindowFocus works
      refetchOnWindowFocus: true, // Refetch when tab regains focus
      refetchOnMount: true, // Refetch when component mounts
      retry: (failureCount, err) => {
        // Don't retry on auth errors (401/403), but retry once on network/server errors
        const status = (err as { status?: number })?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 1;
      },
    },
  });

  const logoutMutation = useAuthControllerLogout();

  const user: UserDto | null = data?.data ?? null;

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Ignore errors
    }
    queryClient.setQueryData(getAuthControllerMeQueryKey(), null);
    router.push('/');
  };

  // Function to manually refresh user data
  // Call this after plan changes, profile updates, etc.
  const refreshUser = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: getAuthControllerMeQueryKey() });
  }, [queryClient]);

  // Distinguish auth failure (401) from API unavailable (network/5xx)
  const isAuthError =
    !!error &&
    (error as { status?: number })?.status !== undefined &&
    ((error as { status?: number }).status === 401 ||
      (error as { status?: number }).status === 403);
  const isApiUnavailable = !!error && !isAuthError;

  return { user, isLoading, error, isAuthError, isApiUnavailable, logout, refreshUser, refetch };
}

export function useRequireAuth() {
  const { user, isLoading, error, isAuthError, isApiUnavailable, logout, refreshUser, refetch } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect to landing if it's a genuine auth failure (401/403),
    // not when the API is unavailable (network error, 5xx, etc.)
    if (!isLoading && !user && !isApiUnavailable) {
      router.push('/');
    }
  }, [user, isLoading, isApiUnavailable, router]);

  return { user, isLoading, isApiUnavailable, logout, refreshUser, refetch };
}

// Standalone function to refresh user from anywhere (e.g., after webhook processing)
export function getRefreshUserFn(queryClient: ReturnType<typeof useQueryClient>) {
  return () => queryClient.invalidateQueries({ queryKey: getAuthControllerMeQueryKey() });
}
