import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";
import { motion } from "framer-motion";

interface StreakBadgeProps {
  count: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: "h-10 w-10 text-sm",
  md: "h-14 w-14 text-lg",
  lg: "h-20 w-20 text-2xl",
};

const iconSizes = {
  sm: 14,
  md: 18,
  lg: 26,
};

export function StreakBadge({ 
  count, 
  size = "md", 
  showLabel = false,
  className 
}: StreakBadgeProps) {
  const isActive = count > 0;
  
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={cn(
          "relative flex items-center justify-center rounded-full font-display font-bold",
          sizeStyles[size],
          isActive 
            ? "bg-accent text-accent-foreground streak-glow" 
            : "bg-muted text-muted-foreground"
        )}
      >
        {isActive && (
          <motion.div
            className="absolute inset-0 rounded-full bg-accent"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ opacity: 0.3 }}
          />
        )}
        <div className="relative flex items-center gap-1">
          <Flame size={iconSizes[size]} className={isActive ? "text-accent-foreground" : ""} />
          <span>{count}</span>
        </div>
      </motion.div>
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Day Streak
        </span>
      )}
    </div>
  );
}
