'use client';

import { useEffect } from 'react';
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

  const { data, isLoading, error } = useAuthControllerMe();
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

  return { user, isLoading, logout };
}

export function useRequireAuth() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  return { user, isLoading, logout };
}
