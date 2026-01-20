import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface InsightCardProps {
  title?: string;
  message: string;
  type?: "positive" | "neutral" | "warning";
  className?: string;
}

const typeStyles = {
  positive: "border-success/20 bg-success/5",
  neutral: "border-primary/20 bg-primary/5",
  warning: "border-accent/20 bg-accent/5",
};

const iconStyles = {
  positive: "text-success",
  neutral: "text-primary",
  warning: "text-accent",
};

export function InsightCard({ 
  title = "AI Insight", 
  message, 
  type = "neutral",
  className 
}: InsightCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className={cn(
        "relative overflow-hidden rounded-xl border p-5",
        typeStyles[type],
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5", iconStyles[type])}>
          <Sparkles size={18} />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p className="text-sm leading-relaxed text-foreground">
            {message}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
