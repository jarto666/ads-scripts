import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreditsProps {
  amount: number;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Credits({
  amount,
  className,
  showIcon = true,
  size = "md",
}: CreditsProps) {
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium",
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Coins className={cn(iconSizes[size], "text-warning")} />}
      {amount.toLocaleString()}
    </span>
  );
}

interface CreditsCostProps {
  amount: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function CreditsCost({ amount, className, size = "sm" }: CreditsCostProps) {
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 opacity-70",
        sizeClasses[size],
        className
      )}
    >
      <Coins className={iconSizes[size]} />
      {amount.toLocaleString()}
    </span>
  );
}
