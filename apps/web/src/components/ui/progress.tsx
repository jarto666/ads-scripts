'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  showValue?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, showValue = false, variant = 'default', ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const variantClasses = {
      default: 'bg-primary',
      success: 'bg-success',
      warning: 'bg-warning',
      destructive: 'bg-destructive',
    };

    return (
      <div className="relative">
        <div
          ref={ref}
          className={cn(
            'relative h-2 w-full overflow-hidden rounded-full bg-secondary',
            className,
          )}
          {...props}
        >
          <div
            className={cn(
              'h-full transition-all duration-500 ease-out rounded-full',
              variantClasses[variant],
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showValue && (
          <span className="absolute right-0 -top-6 text-xs text-muted-foreground">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    );
  },
);
Progress.displayName = 'Progress';

export { Progress };
