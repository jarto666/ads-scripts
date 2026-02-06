"use client";

import { useRouter } from "next/navigation";
import { Zap, Crown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UpsellModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPro: boolean;
}

export function UpsellModal({ open, onOpenChange, isPro }: UpsellModalProps) {
  const router = useRouter();

  const handleAction = () => {
    onOpenChange(false);
    router.push(isPro ? "/pricing#packs" : "/pricing");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-center sm:text-center">
          <div className="flex justify-center mb-3">
            <div className="rounded-full bg-primary/10 p-3">
              {isPro ? (
                <Zap className="h-6 w-6 text-primary" />
              ) : (
                <Crown className="h-6 w-6 text-primary" />
              )}
            </div>
          </div>
          <DialogTitle>
            {isPro ? "Out of credits" : "Upgrade to Pro"}
          </DialogTitle>
          <DialogDescription className="pt-1">
            {isPro
              ? "You've used all your credits. Grab a credit pack to keep generating scripts."
              : "You've used all your free credits. Upgrade to Pro for 500 credits per month and unlimited potential."}
          </DialogDescription>
        </DialogHeader>
        <div className="pt-2">
          <Button onClick={handleAction} className="w-full">
            {isPro ? (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Buy credit pack
              </>
            ) : (
              <>
                <Crown className="h-4 w-4 mr-2" />
                View Pro plan
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
