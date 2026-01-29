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
      retry: false, // Don't retry on auth errors
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

  return { user, isLoading, logout, refreshUser, refetch };
}

export function useRequireAuth() {
  const { user, isLoading, logout, refreshUser, refetch } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  return { user, isLoading, logout, refreshUser, refetch };
}

// Standalone function to refresh user from anywhere (e.g., after webhook processing)
export function getRefreshUserFn(queryClient: ReturnType<typeof useQueryClient>) {
  return () => queryClient.invalidateQueries({ queryKey: getAuthControllerMeQueryKey() });
}
