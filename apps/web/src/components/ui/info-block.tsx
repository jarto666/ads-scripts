'use client';

import * as React from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoTipProps {
  children: React.ReactNode;
  className?: string;
}

export function InfoTip({ children, className }: InfoTipProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const tooltipRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        tooltipRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <span className={cn('relative inline-flex items-center align-middle', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        className="text-muted-foreground hover:text-foreground transition-colors ml-1.5 inline-flex items-center"
        aria-label="More info"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {isOpen && (
        <div
          ref={tooltipRef}
          className="absolute z-50 left-0 top-full mt-2 w-64 p-3 rounded-lg bg-popover border border-border shadow-lg text-xs text-muted-foreground leading-relaxed"
        >
          {children}
        </div>
      )}
    </span>
  );
}

// Keep old export name for compatibility but redirect to new component
export const InfoBlock = InfoTip;
