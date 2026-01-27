import { usePathname, useSearchParams } from 'next/navigation';
import { useLayoutEffect, useRef, useCallback } from 'react';

type Options = {
  effect: () => void;
  alternate?: () => void;
  withoutDeleteKey?: boolean;
  debounceInterval?: number;
};

export const useQueryEffect = (
  key: string,
  { effect, alternate, withoutDeleteKey, debounceInterval = 50 }: Options,
) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const target = searchParams.get(key);

  // Use refs to avoid re-running effect when callbacks change
  const effectRef = useRef(effect);
  const alternateRef = useRef(alternate);

  useLayoutEffect(() => {
    effectRef.current = effect;
  }, [effect]);

  useLayoutEffect(() => {
    alternateRef.current = alternate;
  }, [alternate]);

  useLayoutEffect(() => {
    if (target) {
      const timeoutId = setTimeout(() => {
        effectRef.current();
      }, debounceInterval);

      if (!withoutDeleteKey) {
        const queryParams = new URLSearchParams(searchParams);
        queryParams.delete(key);

        const newUrl = queryParams.toString()
          ? `${pathname}?${queryParams.toString()}`
          : pathname;

        window.history.replaceState({}, '', newUrl);
      }

      return () => clearTimeout(timeoutId);
    } else {
      alternateRef.current?.();
    }
  }, [key, pathname, searchParams, target, withoutDeleteKey, debounceInterval]);
};
