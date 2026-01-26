import { useState } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { StreakSection } from "@/components/dashboard/StreakSection";
import { CheckInCard } from "@/components/dashboard/CheckInCard";
import { ProgressCard } from "@/components/dashboard/ProgressCard";
import { InsightCard } from "@/components/ui/insight-card";
import heroImage from "@/assets/hero-skincare.jpg";

const Index = () => {
  const [userData] = useState({
    currentStreak: 5,
    longestStreak: 12,
    totalDays: 23,
    daysTracked: 14,
  });

  const [metrics] = useState([
    { label: "Acne Reduction", value: 18, trend: "down" as const, isGood: true },
    { label: "Redness", value: 12, trend: "down" as const, isGood: true },
    { label: "Skin Clarity", value: 24, trend: "up" as const, isGood: true },
  ]);

  const [savedRoutineSteps] = useState<string[]>([
    "Cleanse",
    "Moisturize",
    "Sunscreen"
  ]);

  const handlePhotoUpload = () => {
    console.log("Photo uploaded");
  };

  const handleRoutineComplete = (steps: any[]) => {
    console.log("Routine updated:", steps);
  };

  const handleRoutineSave = (steps: string[]) => {
    console.log("Routine saved:", steps);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 h-[280px]"
        >
          <img
            src={heroImage}
            alt="Skincare products"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
        </motion.div>

        <div className="relative container max-w-lg mx-auto px-4">
          <Header />

          {/* Welcome Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6 mb-8"
          >
            <h2 className="font-display text-3xl font-bold text-foreground leading-tight">
              Good morning,
              <br />
              <span className="text-primary">let's glow</span> today.
            </h2>
            <p className="mt-3 text-muted-foreground">
              You're building something beautiful, one day at a time.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-lg mx-auto px-4 pb-8 space-y-5">
        {/* Streak Section */}
        <StreakSection
          currentStreak={userData.currentStreak}
          longestStreak={userData.longestStreak}
          totalDays={userData.totalDays}
        />

        {/* AI Insight */}
        <InsightCard
          type="positive"
          message="Inflammation reduced by 7% over 4 days. Your current routine is working. keep it consistent."
        />

        {/* Two Column Layout on larger screens */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* Check-in Card */}
          <CheckInCard
            hasCheckedInToday={false}
            onPhotoUpload={handlePhotoUpload}
            onRoutineComplete={handleRoutineComplete}
            onRoutineSave={handleRoutineSave}
            savedRoutineSteps={savedRoutineSteps}
          />

          {/* Progress Card */}
          <ProgressCard
            metrics={metrics}
            daysTracked={userData.daysTracked}
          />
        </div>

        {/* Product Insight */}
        <InsightCard
          title="Product Fit"
          type="neutral"
          message="The Niacinamide serum is effective for acne reduction. 21% of similar users reported dryness after week two. Consider adding a hydrating layer."
        />

        {/* Motivational Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center py-6"
        >
          <p className="text-sm text-muted-foreground">
            You showed up for yourself today.
            <br />
            <span className="text-primary font-medium">That matters.</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
