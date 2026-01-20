import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Camera, 
  TrendingUp, 
  Heart,
  ArrowRight,
  Check,
  Flame,
  Shield,
  Zap
} from "lucide-react";
import heroImage from "@/assets/hero-skincare.jpg";

const features = [
  {
    icon: Camera,
    title: "Daily Photo Tracking",
    description: "Capture your progress with daily photos. Our AI analyzes trends in acne, redness, and texture over time."
  },
  {
    icon: Sparkles,
    title: "AI-Powered Insights",
    description: "Get personalized insights based on your skin data. Know what's working and what needs adjustment."
  },
  {
    icon: Flame,
    title: "Gamified Streaks",
    description: "Build consistency with streak rewards. Unlock real-world gestures like tree planting and meal donations."
  },
  {
    icon: TrendingUp,
    title: "Progress Analytics",
    description: "Visualize your improvement over time with detailed charts and metrics that actually matter."
  },
  {
    icon: Shield,
    title: "Product Evaluation",
    description: "AI cross-checks products against real user feedback to give you honest fit scores."
  },
  {
    icon: Heart,
    title: "Personalized Routines",
    description: "Tailored recommendations based on your skin type, goals, and what's actually working for you."
  }
];

const milestones = [
  { days: 3, title: "Proof Builder", description: "First milestone" },
  { days: 7, title: "Consistency Mode", description: "One week strong" },
  { days: 14, title: "Identity Lock", description: "Habit forming" },
  { days: 30, title: "Ritual Master", description: "Lifestyle achieved" },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-display text-xl sm:text-2xl font-bold text-foreground"
            >
              Clear<span className="text-primary">Day</span>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 sm:gap-4"
            >
              <Button 
                variant="ghost" 
                onClick={() => navigate("/login")}
                className="text-sm sm:text-base"
              >
                Login
              </Button>
              <Button 
                onClick={() => navigate("/signup")}
                className="gap-2 text-sm sm:text-base"
              >
                Get Started <ArrowRight size={16} className="hidden sm:block" />
              </Button>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-16 sm:pt-20 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Skincare" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
        </div>

        <div className="relative container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-6">
                <Sparkles size={14} className="sm:w-4 sm:h-4" />
                AI-Powered Skincare Companion
              </div>
              
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight mb-4 sm:mb-6">
                Build habits.
                <br />
                <span className="text-primary">See results.</span>
              </h1>
              
              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-lg">
                Track your skincare journey with AI-powered insights, gamified streaks, 
                and real progress analytics. Consistency beats perfection.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 sm:mb-12">
                <Button 
                  size="lg" 
                  onClick={() => navigate("/signup")}
                  className="gap-2 text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto"
                >
                  Start Your Journey <ArrowRight size={18} className="sm:w-5 sm:h-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                  className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto"
                >
                  Learn More
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Check size={16} className="text-success" /> Free to start
                </span>
                <span className="flex items-center gap-2">
                  <Check size={16} className="text-success" /> No ads
                </span>
                <span className="flex items-center gap-2">
                  <Check size={16} className="text-success" /> Privacy first
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative">
                {/* Streak Card Preview */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="bg-card rounded-2xl shadow-elevated p-6 border border-border"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center">
                      <Flame size={32} className="text-accent-foreground" />
                    </div>
                    <div>
                      <p className="font-display text-4xl font-bold text-foreground">14</p>
                      <p className="text-muted-foreground">Day Streak</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {milestones.map((milestone, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${i < 2 ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}`}>
                          {milestone.days}
                        </div>
                        <span className={`text-sm ${i < 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {milestone.title}
                        </span>
                        {i < 2 && <Check size={16} className="text-success ml-auto" />}
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Floating Insight Card */}
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="absolute -bottom-8 -left-8 bg-card rounded-xl shadow-elevated p-4 border border-border max-w-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                      <Zap size={16} className="text-success" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">AI Insight</p>
                      <p className="text-xs text-muted-foreground">Inflammation reduced 7% in 4 days</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-20 lg:py-24 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4">
              Everything you need to <span className="text-primary">glow</span>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              ClearDay combines AI-powered insights with gamification to help you build 
              lasting skincare habits.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-2xl p-5 sm:p-6 lg:p-8 border border-border hover:border-primary/30 transition-colors group"
              >
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-primary/20 transition-colors">
                  <feature.icon size={24} className="sm:w-7 sm:h-7 text-primary" />
                </div>
                <h3 className="font-display text-lg sm:text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4">
              Simple as <span className="text-primary">1-2-3</span>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              Get started in minutes, see results in weeks.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {[
              { step: 1, title: "Snap a photo", description: "Take a quick selfie each day to track your skin" },
              { step: 2, title: "Complete routine", description: "Log your skincare steps and stay consistent" },
              { step: 3, title: "Watch progress", description: "AI shows you what's working over time" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-primary text-primary-foreground font-display text-2xl sm:text-3xl font-bold flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  {item.step}
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-primary/5">
        <div className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6">
              Ready to transform your skin?
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-xl mx-auto px-4">
              Join thousands who are building better skincare habits with ClearDay. 
              Start your journey today — it's free.
            </p>
            <Button 
              size="lg" 
              onClick={() => navigate("/login")}
              className="gap-2 text-base sm:text-lg px-8 sm:px-12 py-5 sm:py-6"
            >
              Get Started Free <ArrowRight size={18} className="sm:w-5 sm:h-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 border-t border-border">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="font-display text-lg sm:text-xl font-bold text-foreground">
              Clear<span className="text-primary">Day</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-right">
              © 2024 ClearDay. Building better skin habits.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
