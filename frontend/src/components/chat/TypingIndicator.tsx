// src/components/chat/TypingIndicator.tsx

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  userName?: string;
  variant?: "default" | "minimal" | "with-text";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function TypingIndicator({
  userName,
  variant = "default",
  size = "md",
  className,
}: TypingIndicatorProps) {
  // Size configurations
  const sizeConfig = {
    sm: {
      dot: "w-1.5 h-1.5",
      gap: "gap-0.5",
      text: "text-[10px]",
    },
    md: {
      dot: "w-2 h-2",
      gap: "gap-1",
      text: "text-xs",
    },
    lg: {
      dot: "w-2.5 h-2.5",
      gap: "gap-1.5",
      text: "text-sm",
    },
  };

  const config = sizeConfig[size];

  // Animation variants for dots
  const dotVariants = {
    initial: { opacity: 0.4, y: 0 },
    animate: { opacity: 1, y: -3 },
  };

  const containerVariants = {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
  };

  // Minimal variant - just dots
  if (variant === "minimal") {
    return (
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={cn("flex items-center", config.gap, className)}
      >
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            variants={dotVariants}
            animate={{
              opacity: [0.4, 1, 0.4],
              y: [0, -3, 0],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: index * 0.15,
              ease: "easeInOut",
            }}
            className={cn(config.dot, "bg-gray-400 rounded-full")}
          />
        ))}
      </motion.div>
    );
  }

  // With text variant - shows "User is typing..."
  if (variant === "with-text") {
    return (
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={cn("flex items-center gap-2", className)}
      >
        <div className={cn("flex items-center", config.gap)}>
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              animate={{
                opacity: [0.4, 1, 0.4],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: index * 0.15,
                ease: "easeInOut",
              }}
              className={cn(config.dot, "bg-[#0891B2] rounded-full")}
            />
          ))}
        </div>
        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={cn(config.text, "text-[#475569] font-medium")}
        >
          {userName ? `${userName} is typing...` : "typing..."}
        </motion.span>
      </motion.div>
    );
  }

  // Default variant - dots with optional username
  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn("flex items-center", className)}
    >
      <div className={cn("flex items-center", config.gap)}>
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            animate={{
              opacity: [0.4, 1, 0.4],
              y: [0, -4, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: index * 0.2,
              ease: "easeInOut",
            }}
            className={cn(config.dot, "bg-gray-400 rounded-full")}
          />
        ))}
      </div>
      {userName && (
        <span className={cn(config.text, "text-[#475569] ml-2")}>
          {userName} is typing...
        </span>
      )}
    </motion.div>
  );
}

// ============================================
// ALTERNATIVE: Pulse Typing Indicator
// ============================================

interface PulseTypingIndicatorProps {
  className?: string;
}

export function PulseTypingIndicator({ className }: PulseTypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn("flex items-center gap-1", className)}
    >
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="w-2 h-2 bg-[#0891B2] rounded-full"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: index * 0.15,
          }}
        />
      ))}
    </motion.div>
  );
}

// ============================================
// ALTERNATIVE: Wave Typing Indicator
// ============================================

interface WaveTypingIndicatorProps {
  color?: string;
  className?: string;
}

export function WaveTypingIndicator({ 
  color = "#22D3EE", 
  className 
}: WaveTypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn("flex items-end gap-0.5 h-4", className)}
    >
      {[0, 1, 2, 3, 4].map((index) => (
        <motion.div
          key={index}
          className="w-1 rounded-full"
          style={{ backgroundColor: color }}
          animate={{
            height: ["8px", "16px", "8px"],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: index * 0.1,
            ease: "easeInOut",
          }}
        />
      ))}
    </motion.div>
  );
}

// ============================================
// ALTERNATIVE: Bounce Typing Indicator
// ============================================

interface BounceTypingIndicatorProps {
  userName?: string;
  className?: string;
}

export function BounceTypingIndicator({ 
  userName, 
  className 
}: BounceTypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={cn("flex items-center gap-2", className)}
    >
      <div className="flex items-center gap-1 px-3 py-2 bg-white/5 rounded-full">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className="w-2 h-2 bg-white/50 rounded-full"
            animate={{
              y: [0, -6, 0],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: index * 0.1,
              ease: "easeOut",
            }}
          />
        ))}
      </div>
      {userName && (
        <span className="text-xs text-[#475569] font-medium">
          {userName} is typing
        </span>
      )}
    </motion.div>
  );
}