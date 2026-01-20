import { motion } from "framer-motion";
import { AlertTriangle, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakWarningProps {
  daysMissed: number;
}

const warnings = {
  1: {
    icon: Clock,
    title: "Don't break your streak!",
    message: "You missed yesterday's check-in. Log today to keep your streak alive.",
    severity: "gentle",
    bgColor: "bg-accent/10",
    borderColor: "border-accent/30",
    iconColor: "text-accent",
  },
  2: {
    icon: AlertTriangle,
    title: "Your streak is at risk",
    message: "2 days missed. One more day and your analytics will reset. We believe in you!",
    severity: "warning",
    bgColor: "bg-accent/15",
    borderColor: "border-accent/50",
    iconColor: "text-accent",
  },
  3: {
    icon: XCircle,
    title: "Last chance!",
    message: "3 days missed. Check in today or your progress data will reset tomorrow. Your photos are always saved.",
    severity: "critical",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/30",
    iconColor: "text-destructive",
  },
};

export function StreakWarning({ daysMissed }: StreakWarningProps) {
  if (daysMissed < 1 || daysMissed > 3) return null;

  const warning = warnings[daysMissed as 1 | 2 | 3];
  const Icon = warning.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "rounded-xl border p-5",
        warning.bgColor,
        warning.borderColor
      )}
    >
      <div className="flex items-start gap-4">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={cn("mt-0.5", warning.iconColor)}
        >
          <Icon size={24} />
        </motion.div>
        <div className="flex-1">
          <h3 className="font-display text-lg font-semibold text-foreground mb-1">
            {warning.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {warning.message}
          </p>
        </div>
        <div className="text-right">
          <div className="inline-flex items-center gap-1 bg-background/80 rounded-full px-3 py-1">
            <span className="font-display text-2xl font-bold text-foreground">{daysMissed}</span>
            <span className="text-xs text-muted-foreground">day{daysMissed > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
