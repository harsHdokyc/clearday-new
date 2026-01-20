import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricProps {
  label: string;
  value: number;
  trend: "up" | "down" | "neutral";
  isGood: boolean;
}

interface ProgressCardProps {
  metrics: MetricProps[];
  daysTracked: number;
  progressData?: Array<{ date: string; hasData: boolean; value?: number }>;
}

function Metric({ label, value, trend, isGood }: MetricProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "neutral" 
    ? "text-muted-foreground" 
    : isGood 
      ? "text-success" 
      : "text-accent";

  // Don't show metrics if value is 0 (no data yet)
  if (value === 0) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-display text-lg font-semibold text-muted-foreground">
          --
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-display text-lg font-semibold text-foreground">
          {value}%
        </span>
        <TrendIcon size={16} className={trendColor} />
      </div>
    </div>
  );
}

export function ProgressCard({ metrics, daysTracked, progressData }: ProgressCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="rounded-2xl bg-card p-6 shadow-soft"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Skin Progress
        </h2>
        <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
          {daysTracked} days tracked
        </span>
      </div>

      <div className="mb-5">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
          >
            <Metric {...metric} />
          </motion.div>
        ))}
      </div>

      {/* Mini visualization */}
      <div className="h-16 flex items-end justify-between gap-1.5 px-1">
        {progressData && progressData.length > 0 ? (
          progressData.slice(-14).map((day, index) => {
            if (!day.hasData) return null;
            
            const height = day.value ? Math.max(20, Math.min(100, day.value)) : 30;
            const isToday = index === progressData.slice(-14).length - 1;
            
            return (
              <motion.div
                key={day.date}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ delay: 0.5 + index * 0.05, duration: 0.3 }}
                className={cn(
                  "flex-1 rounded-sm",
                  isToday ? "bg-primary" : "bg-primary/30"
                )}
                title={new Date(day.date).toLocaleDateString()}
              />
            );
          })
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <p className="text-xs text-muted-foreground">No progress data yet</p>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground text-center mt-2">
        {progressData && progressData.length > 0 ? "Last 14 days" : "Start tracking to see progress"}
      </p>
    </motion.div>
  );
}
