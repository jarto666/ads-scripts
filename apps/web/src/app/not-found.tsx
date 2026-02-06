"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

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

// Subtle glitch: quick horizontal jitter that fires every few seconds
const glitch = {
  animate: {
    x: [0, -3, 4, -2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    skewX: [0, -1, 2, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  transition: {
    duration: 4,
    repeat: Infinity,
    ease: "linear" as const,
    times: [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.07] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, oklch(0.75 0.18 195) 0%, transparent 70%)",
        }}
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 text-center px-6"
      >
        {/* 404 number with glitch */}
        <motion.div variants={item} className="mb-8 relative">
          <motion.span
            className="text-[10rem] sm:text-[14rem] font-black leading-none tracking-tighter text-primary/20 select-none inline-block"
            style={{
              textShadow:
                "0 0 60px oklch(0.75 0.18 195 / 0.2), 0 0 2px oklch(0.75 0.18 195 / 0.4)",
            }}
            animate={glitch.animate}
            transition={glitch.transition}
          >
            404
          </motion.span>
        </motion.div>

        {/* Message */}
        <motion.p
          variants={item}
          className="text-lg sm:text-xl text-muted-foreground font-medium tracking-tight"
        >
          This scene didn&apos;t make the final cut.
        </motion.p>

        <motion.p
          variants={item}
          className="mt-3 text-sm text-muted-foreground/60"
        >
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </motion.p>

        {/* CTA */}
        <motion.div variants={item} className="mt-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
