import { motion } from "framer-motion";
import { 
  Flame, 
  Check, 
  Lock, 
  Gift, 
  Heart, 
  TreePine, 
  Trophy,
  Star,
  Sparkles,
  Target,
  Zap,
  Crown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useJourneyData } from "@/hooks/useJourneyData";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";


export default function Journey() {
  const {
    milestones,
    nextMilestone,
    currentStreak,
    longestStreak,
    totalDays,
    daysMissed,
    isLoading,
    error
  } = useJourneyData();

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your journey...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-3">
            Your Skincare Journey
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-md mx-auto">
            Every streak unlocks new features and opportunities to give back
          </p>
        </motion.div>

        {/* Current Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-4 sm:p-6 lg:p-8 shadow-soft mb-8 sm:mb-12"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="text-center">
              <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wide mb-1">
                Current Streak
              </p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="font-display text-3xl sm:text-4xl font-bold text-foreground">
                  {currentStreak}
                </span>
                <span className="text-sm sm:text-base text-muted-foreground">days</span>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wide mb-1">
                Longest Streak
              </p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="font-display text-3xl sm:text-4xl font-bold text-foreground">
                  {longestStreak}
                </span>
                <span className="text-sm sm:text-base text-muted-foreground">days</span>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wide mb-1">
                Total Days
              </p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="font-display text-3xl sm:text-4xl font-bold text-foreground">
                  {totalDays}
                </span>
                <span className="text-sm sm:text-base text-muted-foreground">tracked</span>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wide mb-1">
                Days Missed
              </p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="font-display text-3xl sm:text-4xl font-bold text-foreground">
                  {daysMissed}
                </span>
                <span className="text-sm sm:text-base text-muted-foreground">in a row</span>
              </div>
            </div>
          </div>
          
          {nextMilestone && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="sm:text-left">
                  <p className="text-sm text-muted-foreground mb-2">
                    Next milestone in <span className="font-bold text-accent">{nextMilestone.days - currentStreak}</span> days
                  </p>
                  <div className="flex items-center gap-2">
                    <nextMilestone.icon size={18} className="text-primary" />
                    <span className="font-display font-semibold text-foreground">
                      {nextMilestone.title}
                    </span>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="flex-1 sm:max-w-48">
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${(currentStreak / nextMilestone.days) * 100}%` 
                      }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Journey Map - Mobile: Vertical list, Desktop: Alternating */}
        <div className="relative">
          {/* Connecting Line - hidden on mobile */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-1 bg-border -translate-x-1/2" />
          
          {/* Mobile connecting line */}
          <div className="lg:hidden absolute left-5 sm:left-6 top-0 bottom-0 w-0.5 bg-border" />
          
          {/* Milestones */}
          <div className="space-y-4 sm:space-y-6 lg:space-y-8">
            {milestones.map((milestone, index) => {
              const Icon = milestone.icon;
              const isLeft = index % 2 === 0;
              
              return (
                <motion.div
                  key={milestone.days}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className={cn(
                    "relative flex items-start gap-4 lg:items-center lg:gap-8",
                    "lg:flex-row",
                    isLeft ? "" : "lg:flex-row-reverse"
                  )}
                >
                  {/* Mobile/Tablet: Icon on left */}
                  <div className="relative z-10 lg:hidden flex-shrink-0">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className={cn(
                        "h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center border-2 sm:border-4",
                        milestone.current
                          ? "bg-primary border-primary text-primary-foreground"
                          : milestone.unlocked
                            ? "bg-success border-success text-success-foreground"
                            : "bg-muted border-border text-muted-foreground"
                      )}
                    >
                      {milestone.unlocked ? (
                        milestone.current ? (
                          <Icon size={18} className="sm:w-5 sm:h-5" />
                        ) : (
                          <Check size={18} className="sm:w-5 sm:h-5" />
                        )
                      ) : (
                        <Lock size={16} className="sm:w-[18px] sm:h-[18px]" />
                      )}
                    </motion.div>
                    
                    {milestone.current && (
                      <motion.div
                        className="absolute inset-0 rounded-full bg-primary"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </div>

                  {/* Content Card - Mobile full width */}
                  <div className="flex-1 lg:flex-none lg:max-w-sm">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className={cn(
                        "p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl border-2 transition-all",
                        milestone.current
                          ? "bg-primary/5 border-primary shadow-glow"
                          : milestone.unlocked
                            ? "bg-card border-success/30"
                            : "bg-muted/30 border-border"
                      )}
                    >
                      <div className={cn(
                        "flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2",
                        isLeft ? "lg:justify-end" : "lg:justify-start"
                      )}>
                        <h3 className="font-display text-base sm:text-lg lg:text-xl font-bold text-foreground">
                          {milestone.title}
                        </h3>
                        <span className="text-xs sm:text-sm text-muted-foreground">Day {milestone.days}</span>
                      </div>
                      
                      <p className={cn(
                        "text-sm text-muted-foreground mb-2 sm:mb-3",
                        isLeft ? "lg:text-right" : ""
                      )}>
                        {milestone.subtitle}
                      </p>
                      
                      {milestone.reward && (
                        <p className={cn(
                          "text-xs sm:text-sm font-medium",
                          milestone.unlocked ? "text-success" : "text-muted-foreground",
                          isLeft ? "lg:text-right" : ""
                        )}>
                          {milestone.unlocked ? "✓ " : "🔒 "}{milestone.reward}
                        </p>
                      )}
                      
                      {milestone.goodDeed && (
                        <div className={cn(
                          "mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border flex items-center gap-2",
                          isLeft ? "lg:justify-end" : "lg:justify-start"
                        )}>
                          <milestone.goodDeed.icon size={14} className="text-accent" />
                          <span className="text-xs sm:text-sm text-accent font-medium">
                            {milestone.goodDeed.label}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  </div>

                  {/* Desktop: Center Icon */}
                  <div className="hidden lg:block relative z-10">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className={cn(
                        "h-16 w-16 rounded-full flex items-center justify-center border-4",
                        milestone.current
                          ? "bg-primary border-primary text-primary-foreground"
                          : milestone.unlocked
                            ? "bg-success border-success text-success-foreground"
                            : "bg-muted border-border text-muted-foreground"
                      )}
                    >
                      {milestone.unlocked ? (
                        milestone.current ? (
                          <Icon size={28} />
                        ) : (
                          <Check size={28} />
                        )
                      ) : (
                        <Lock size={24} />
                      )}
                    </motion.div>
                    
                    {milestone.current && (
                      <motion.div
                        className="absolute inset-0 rounded-full bg-primary"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </div>

                  {/* Spacer for opposite side - Desktop only */}
                  <div className="hidden lg:block flex-1 max-w-sm" />
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA & Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-10 sm:mt-12 lg:mt-16"
        >
          {/* Unlocked Features */}
          {milestones.some(m => m.unlocked && m.reward) && (
            <div className="mb-8 text-center">
              <h3 className="font-display text-lg sm:text-xl font-semibold text-foreground mb-4">
                Unlocked Features
              </h3>
              <div className="flex flex-wrap justify-center gap-2">
                {milestones
                  .filter(m => m.unlocked && m.reward)
                  .map((milestone) => (
                    <div
                      key={milestone.days}
                      className="bg-success/10 border border-success/30 rounded-full px-3 py-1 text-sm text-success"
                    >
                      ✓ {milestone.reward?.replace('Unlocked: ', '')}
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          {/* Good Deeds Progress */}
          {milestones.some(m => m.unlocked && m.goodDeed) && (
            <div className="mb-8 text-center">
              <h3 className="font-display text-lg sm:text-xl font-semibold text-foreground mb-4">
                Impact Made Possible
              </h3>
              <div className="flex flex-wrap justify-center gap-3">
                {milestones
                  .filter(m => m.unlocked && m.goodDeed)
                  .map((milestone) => {
                    const GoodDeedIcon = milestone.goodDeed!.icon;
                    return (
                      <div
                        key={milestone.days}
                        className="flex items-center gap-2 bg-accent/10 border border-accent/30 rounded-full px-3 py-2"
                      >
                        <GoodDeedIcon size={16} className="text-accent" />
                        <span className="text-sm text-accent font-medium">
                          {milestone.goodDeed!.label}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
          
          <div className="text-center">
            <p className="text-sm sm:text-base text-muted-foreground mb-1 sm:mb-2">
              You showed up for yourself.
            </p>
            <p className="font-display text-lg sm:text-xl font-semibold text-primary">
              Want to pass that forward?
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
