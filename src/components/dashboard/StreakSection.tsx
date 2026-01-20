import { motion } from "framer-motion";
import { StreakBadge } from "@/components/ui/streak-badge";
import { CheckCircle2, Target, Trophy } from "lucide-react";

interface StreakSectionProps {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
}

const milestones = [
  { days: 3, label: "Proof Builder", icon: CheckCircle2 },
  { days: 7, label: "Consistency Mode", icon: Target },
  { days: 14, label: "Identity Lock", icon: Trophy },
  { days: 30, label: "Ritual Master", icon: Trophy },
];

export function StreakSection({ currentStreak, longestStreak, totalDays }: StreakSectionProps) {
  const currentMilestone = milestones.filter(m => currentStreak >= m.days).pop();
  const nextMilestone = milestones.find(m => currentStreak < m.days);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl bg-card p-6 shadow-soft"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              Your Journey
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {currentMilestone 
                ? `You've reached ${currentMilestone.label}` 
                : "Start your streak today"}
            </p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="font-display text-3xl font-bold text-foreground">{longestStreak}</p>
              <p className="text-xs text-muted-foreground">Best Streak</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="font-display text-3xl font-bold text-foreground">{totalDays}</p>
              <p className="text-xs text-muted-foreground">Total Days</p>
            </div>
          </div>
        </div>
        
        <StreakBadge count={currentStreak} size="lg" showLabel />
      </div>

      {nextMilestone && (
        <div className="mt-6 pt-5 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <nextMilestone.icon size={16} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {nextMilestone.days - currentStreak} days to {nextMilestone.label}
              </span>
            </div>
            <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ 
                  width: `${Math.min((currentStreak / nextMilestone.days) * 100, 100)}%` 
                }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="h-full bg-accent rounded-full"
              />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
