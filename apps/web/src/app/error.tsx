"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, RotateCcw } from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

// Subtle glitch on the heading
const glitch = {
  animate: {
    x: [0, -2, 3, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    skewX: [0, -0.5, 1, -0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  transition: {
    duration: 5,
    repeat: Infinity,
    ease: "linear" as const,
    times: [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
  },
};

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Ambient glow — red-shifted for error state */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, oklch(0.65 0.2 25) 0%, transparent 70%)",
        }}
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 text-center px-6 max-w-md"
      >
        {/* Pulsing indicator */}
        <motion.div variants={item} className="flex justify-center mb-8">
          <motion.div
            className="w-3 h-3 rounded-full bg-destructive"
            animate={{ opacity: [1, 0.3, 1], scale: [1, 0.85, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        {/* Message with glitch */}
        <motion.h1
          variants={item}
          className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
        >
          <motion.span
            className="inline-block"
            animate={glitch.animate}
            transition={glitch.transition}
          >
            Something went wrong
          </motion.span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-3 text-sm text-muted-foreground/60"
        >
          An unexpected error occurred. You can try again or head back home.
        </motion.p>

        {/* Error digest */}
        {error.digest && (
          <motion.p
            variants={item}
            className="mt-4 text-xs font-mono text-muted-foreground/30 tracking-wide"
          >
            {error.digest}
          </motion.p>
        )}

        {/* Actions */}
        <motion.div
          variants={item}
          className="mt-10 flex items-center justify-center gap-6"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Home
          </Link>

          <button
            onClick={reset}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors group"
          >
            <RotateCcw className="h-4 w-4 transition-transform group-hover:-rotate-45" />
            Try again
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
