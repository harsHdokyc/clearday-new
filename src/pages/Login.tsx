import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Sparkles, Eye, EyeOff, AlertCircle } from "lucide-react";
import heroImage from "@/assets/hero-skincare.jpg";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Add timeout wrapper
      const loginPromise = login(email, password);
      const timeoutPromise = new Promise<{ success: boolean; error?: string }>((_, reject) => 
        setTimeout(() => reject(new Error('Login request timed out. Please check your connection.')), 15000)
      );

      const result = await Promise.race([loginPromise, timeoutPromise]);
      
      if (result.success) {
        // Small delay to ensure state updates
        await new Promise(resolve => setTimeout(resolve, 100));
        const isOnboarded = localStorage.getItem("onboarded");
        navigate(isOnboarded ? "/dashboard" : "/onboarding");
      } else {
        setError(result.error || "Invalid credentials");
      }
    } catch (err: any) {
      const errorMessage = err.message || "An error occurred";
      setError(errorMessage);
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 xl:px-20">
        <div className="w-full max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="mb-6 sm:mb-8 -ml-2 gap-2"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Back to home</span>
              <span className="sm:hidden">Back</span>
            </Button>

            {/* Logo */}
            <div className="mb-6 sm:mb-8">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Welcome back to Clear<span className="text-primary">Day</span>
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Continue your skincare journey. Every day counts.
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 sm:h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 sm:h-12 pr-12 text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-destructive text-xs sm:text-sm bg-destructive/10 p-3 rounded-lg"
                >
                  <AlertCircle size={16} />
                  {error}
                </motion.div>
              )}

              <Button 
                type="submit" 
                size="lg" 
                className="w-full gap-2 h-11 sm:h-12 text-base"
                disabled={isLoading}
              >
                {isLoading ? (
                  "Signing in..."
                ) : (
                  <>
                    Sign In <Sparkles size={18} />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-xs sm:text-sm text-muted-foreground mt-6">
              Don't have an account?{" "}
              <button 
                onClick={() => navigate("/signup")}
                className="text-primary font-medium hover:underline"
              >
                Sign up
              </button>
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Hero Image (hidden on mobile) */}
      <div className="hidden lg:flex flex-1 relative">
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Skincare" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />
        </div>
        
        <div className="relative z-10 flex items-center p-12">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-md"
          >
            <h2 className="font-display text-4xl font-bold text-foreground mb-4">
              Your skin journey
              <br />
              <span className="text-primary">starts today.</span>
            </h2>
            <p className="text-muted-foreground">
              Track progress, build habits, and see real results with AI-powered insights.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
