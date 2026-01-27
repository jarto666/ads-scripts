"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/use-toast';

export interface ScriptProgressEvent {
  batchId: string;
  scriptId: string;
  status: 'generating' | 'completed' | 'failed';
  completedCount: number;
  generatingCount: number;
  totalCount: number;
  progress: number;
}

export interface BatchCompletedEvent {
  batchId: string;
  projectId: string;
  totalScripts: number;
  completedScripts: number;
  failedScripts: number;
}

type ProgressCallback = (event: ScriptProgressEvent) => void;
type CompletedCallback = (event: BatchCompletedEvent) => void;

interface NotificationsContextValue {
  isConnected: boolean;
  subscribeToProgress: (batchId: string, callback: ProgressCallback) => () => void;
  subscribeToCompleted: (batchId: string, callback: CompletedCallback) => () => void;
  setViewingBatchId: (batchId: string | null) => void;
}

// Default no-op value for when context is not available
const defaultContextValue: NotificationsContextValue = {
  isConnected: false,
  subscribeToProgress: () => () => {},
  subscribeToCompleted: () => () => {},
  setViewingBatchId: () => {},
};

const NotificationsContext = createContext<NotificationsContextValue>(defaultContextValue);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Store subscribers for each batch
  const progressSubscribersRef = useRef<Map<string, Set<ProgressCallback>>>(new Map());
  const completedSubscribersRef = useRef<Map<string, Set<CompletedCallback>>>(new Map());

  // Track which batch the user is currently viewing (to suppress toasts)
  const viewingBatchIdRef = useRef<string | null>(null);

  // Connect when user is authenticated
  useEffect(() => {
    if (!user) {
      // Disconnect if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3232';
    const socket = io(`${apiUrl}/notifications`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[WS] Connected to notifications');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[WS] Disconnected from notifications');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[WS] Connection error:', error);
    });

    // Listen for all batch progress events
    socket.onAny((eventName: string, event: ScriptProgressEvent | BatchCompletedEvent) => {
      // Parse event name: batch:{batchId}:progress or batch:{batchId}:completed
      const match = eventName.match(/^batch:([^:]+):(progress|completed)$/);
      if (!match) return;

      const [, batchId, eventType] = match;

      if (eventType === 'progress') {
        const subscribers = progressSubscribersRef.current.get(batchId);
        subscribers?.forEach(callback => callback(event as ScriptProgressEvent));
      } else if (eventType === 'completed') {
        const completedEvent = event as BatchCompletedEvent;

        // Notify specific subscribers
        const subscribers = completedSubscribersRef.current.get(batchId);
        subscribers?.forEach(callback => callback(completedEvent));

        // Show global toast notification with link to batch (unless viewing that batch)
        if (viewingBatchIdRef.current !== batchId) {
          toast({
            title: "Batch completed",
            description: (
              <div className="flex flex-col gap-1">
                <span>{completedEvent.completedScripts}/{completedEvent.totalScripts} scripts generated</span>
                <Link
                  href={`/projects/${completedEvent.projectId}?tab=scripts&batch=${batchId}`}
                  className="text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  View scripts
                </Link>
              </div>
            ),
          });
        }
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [user, toast]);

  const subscribeToProgress = useCallback((batchId: string, callback: ProgressCallback) => {
    if (!progressSubscribersRef.current.has(batchId)) {
      progressSubscribersRef.current.set(batchId, new Set());
    }
    progressSubscribersRef.current.get(batchId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = progressSubscribersRef.current.get(batchId);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          progressSubscribersRef.current.delete(batchId);
        }
      }
    };
  }, []);

  const subscribeToCompleted = useCallback((batchId: string, callback: CompletedCallback) => {
    if (!completedSubscribersRef.current.has(batchId)) {
      completedSubscribersRef.current.set(batchId, new Set());
    }
    completedSubscribersRef.current.get(batchId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = completedSubscribersRef.current.get(batchId);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          completedSubscribersRef.current.delete(batchId);
        }
      }
    };
  }, []);

  const setViewingBatchId = useCallback((batchId: string | null) => {
    viewingBatchIdRef.current = batchId;
  }, []);

  return (
    <NotificationsContext.Provider value={{ isConnected, subscribeToProgress, subscribeToCompleted, setViewingBatchId }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}

/**
 * Hook to subscribe to a specific batch's progress updates
 */
export function useBatchProgress(
  batchId: string | null,
  onProgress?: (event: ScriptProgressEvent) => void,
  onCompleted?: (event: BatchCompletedEvent) => void,
) {
  const { subscribeToProgress, subscribeToCompleted } = useNotifications();

  // Use refs to avoid re-subscribing when callbacks change
  const onProgressRef = useRef(onProgress);
  const onCompletedRef = useRef(onCompleted);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
  }, [onCompleted]);

  useEffect(() => {
    if (!batchId) return;

    const unsubscribers: (() => void)[] = [];

    unsubscribers.push(subscribeToProgress(batchId, (event) => {
      onProgressRef.current?.(event);
    }));
    unsubscribers.push(subscribeToCompleted(batchId, (event) => {
      onCompletedRef.current?.(event);
    }));

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [batchId, subscribeToProgress, subscribeToCompleted]);
}
