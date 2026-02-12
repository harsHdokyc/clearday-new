import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { 
  Sparkles, 
  Droplets, 
  Sun, 
  Shield, 
  ArrowRight, 
  Check,
  Zap
} from "lucide-react";
import heroImage from "@/assets/hero-skincare.jpg";

const skinGoals = [
  { id: "acne", label: "Clear Acne", icon: Zap, description: "Reduce breakouts & inflammation" },
  { id: "glow", label: "Get Glowing", icon: Sparkles, description: "Radiant, healthy-looking skin" },
  { id: "hydrate", label: "Hydrate", icon: Droplets, description: "Combat dryness & flakiness" },
  { id: "protect", label: "Protect", icon: Shield, description: "Anti-aging & sun protection" },
];

const skinTypes = [
  { id: "oily", label: "Oily", description: "Shiny, enlarged pores" },
  { id: "dry", label: "Dry", description: "Tight, flaky patches" },
  { id: "combination", label: "Combination", description: "Oily T-zone, dry cheeks" },
  { id: "sensitive", label: "Sensitive", description: "Easily irritated" },
  { id: "normal", label: "Normal", description: "Balanced, few concerns" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { isAuthenticated, user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isAuthenticated) {
    navigate("/login");
    return null;
  }

  const handleComplete = async () => {
    const goal = selectedGoal || "";
    const type = selectedType || "";
    setSaving(true);
    
    try {
      if (user?.id) {
        const saveWithRetry = async (attempt = 1): Promise<any> => {
          const savePromise = supabase.from("profiles").upsert({
            id: user.id,
            skin_goal: goal || null,
            skin_type: type || null,
            updated_at: new Date().toISOString(),
          }).eq("id", user.id).select();
          
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Database save timeout')), 10000)
          );
          
          try {
            const result = await Promise.race([savePromise, timeoutPromise]) as any;
            return result;
          } catch (error: any) {
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              return saveWithRetry(attempt + 1);
            }
            throw error;
          }
        };
        
        const result = await saveWithRetry();
        const { data, error } = result;
        
        if (error) {
          throw error;
        }
        
        if (!data || data.length === 0) {
          throw new Error('Save failed: No data returned');
        }
        
        await refreshProfile();
        navigate("/dashboard");
      }
    } catch (e: any) {
      alert(`Failed to save profile: ${e.message}. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    // Welcome
    {
      content: (
        <motion.div
          key="welcome"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="text-center max-w-xl mx-auto px-4"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6 sm:mb-8"
          >
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4">
              Welcome to Clear<span className="text-primary">Day</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground">
              Build consistent skincare habits, track your progress, and see real results one day at a time.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Check size={14} className="sm:w-4 sm:h-4 text-success" /> AI-powered insights
              </span>
              <span className="flex items-center gap-2">
                <Check size={14} className="sm:w-4 sm:h-4 text-success" /> Gamified streaks
              </span>
              <span className="flex items-center gap-2">
                <Check size={14} className="sm:w-4 sm:h-4 text-success" /> Real progress
              </span>
            </div>
          </motion.div>
        </motion.div>
      ),
    },
    // Skin Goal
    {
      content: (
        <motion.div
          key="goal"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="max-w-2xl mx-auto px-4"
        >
          <div className="text-center mb-6 sm:mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
              What's your main skin goal?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              We'll personalize your experience based on this
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {skinGoals.map((goal) => (
              <motion.button
                key={goal.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedGoal(goal.id)}
                className={cn(
                  "p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 text-left transition-all",
                  selectedGoal === goal.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className={cn(
                  "h-10 w-10 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4",
                  selectedGoal === goal.id ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <goal.icon size={20} className="sm:w-6 sm:h-6" />
                </div>
                <h3 className="font-display text-base sm:text-lg font-semibold text-foreground mb-1">
                  {goal.label}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">{goal.description}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>
      ),
    },
    // Skin Type
    {
      content: (
        <motion.div
          key="type"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="max-w-2xl mx-auto px-4"
        >
          <div className="text-center mb-6 sm:mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
              What's your skin type?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              This helps our AI give you better product recommendations
            </p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {skinTypes.map((type) => (
              <motion.button
                key={type.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedType(type.id)}
                className={cn(
                  "p-3 sm:p-5 rounded-lg sm:rounded-xl border-2 text-center transition-all",
                  selectedType === type.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <h3 className="font-display text-base sm:text-lg font-semibold text-foreground mb-0.5 sm:mb-1">
                  {type.label}
                </h3>
                <p className="text-xs text-muted-foreground">{type.description}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>
      ),
    },
    // Ready
    {
      content: (
        <motion.div
          key="ready"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="text-center max-w-xl mx-auto px-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="h-16 w-16 sm:h-24 sm:w-24 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6 sm:mb-8"
          >
            <Check size={32} className="sm:w-12 sm:h-12 text-success" />
          </motion.div>
          
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            You're all set!
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8">
            Let's start building your skincare streak. Remember: consistency beats perfection.
          </p>
          
          <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-soft text-left">
            <h3 className="font-display text-base sm:text-lg font-semibold mb-3">Your Profile</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Goal</span>
                <span className="font-medium text-foreground capitalize">{selectedGoal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Skin Type</span>
                <span className="font-medium text-foreground capitalize">{selectedType}</span>
              </div>
            </div>
          </div>
        </motion.div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 opacity-10">
        <img src={heroImage} alt="" className="w-full h-full object-cover" />
      </div>
      
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col justify-center px-4 sm:px-8 py-16 sm:py-20">
        <AnimatePresence mode="wait">
          {steps[step].content}
        </AnimatePresence>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center gap-3 sm:gap-4 mt-8 sm:mt-12"
        >
          {step > 0 && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => setStep(step - 1)}
              className="px-6 sm:px-8 h-11 sm:h-12"
            >
              Back
            </Button>
          )}
          
          {step < steps.length - 1 ? (
            <Button
              size="lg"
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !selectedGoal || step === 2 && !selectedType}
              className="px-6 sm:px-8 gap-2 h-11 sm:h-12"
            >
              Continue <ArrowRight size={16} className="sm:w-[18px] sm:h-[18px]" />
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleComplete}
              disabled={saving}
              className="px-6 sm:px-8 gap-2 h-11 sm:h-12"
            >
              {saving ? "Saving…" : "Start Your Journey"} <Sparkles size={16} className="sm:w-[18px] sm:h-[18px]" />
            </Button>
          )}
        </motion.div>

        {/* Step Indicators */}
        <div className="flex justify-center gap-2 mt-6 sm:mt-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 sm:h-2 rounded-full transition-all",
                i === step ? "w-6 sm:w-8 bg-primary" : "w-1.5 sm:w-2 bg-muted"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
