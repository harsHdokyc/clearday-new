import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import heroImage from "@/assets/hero-skincare.jpg";

export default function EmailVerification() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { verifyOtp } = useAuth();
  const [email, setEmail] = useState(searchParams.get('email') || "");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otp) {
      setError("Please enter your email and OTP code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await verifyOtp(email, otp, 'signup');
      
      if (result.success) {
        setIsVerified(true);
        setTimeout(() => {
          const isOnboarded = localStorage.getItem("onboarded");
          navigate(isOnboarded ? "/dashboard" : "/onboarding");
        }, 2000);
      } else {
        setError(result.error || "Invalid OTP code. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Email Verified!
          </h1>
          <p className="text-muted-foreground mb-4">
            Your email has been successfully verified. Redirecting...
          </p>
        </motion.div>
      </div>
    );
  }

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
              onClick={() => navigate("/signup")}
              className="mb-6 sm:mb-8 -ml-2 gap-2"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Back to sign up</span>
              <span className="sm:hidden">Back</span>
            </Button>

            {/* Logo */}
            <div className="mb-6 sm:mb-8">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Verify Your Email
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Enter the 8-digit verification code sent to your email
              </p>
            </div>

            {/* OTP Entry Form */}
            <form onSubmit={handleOtpSubmit} className="space-y-4 sm:space-y-5">
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
                <Label htmlFor="otp" className="text-sm">Verification Code (OTP)</Label>
                <InputOTP
                  maxLength={8}
                  value={otp}
                  onChange={(value) => setOtp(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                    <InputOTPSlot index={6} />
                    <InputOTPSlot index={7} />
                  </InputOTPGroup>
                </InputOTP>
                <p className="text-xs text-muted-foreground">
                  Enter the 8-digit code from your email
                </p>
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
                disabled={isLoading || !email || otp.length !== 8}
              >
                {isLoading ? (
                  "Verifying..."
                ) : (
                  <>
                    Verify Email <Mail size={18} />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-xl">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground mb-1">
                    Check your email inbox
                  </p>
                  <p className="text-xs text-muted-foreground">
                    We sent an 8-digit verification code to <strong>{email || "your email address"}</strong>. Enter the code above to verify your account.
                  </p>
                </div>
              </div>
            </div>
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
              Almost there!
              <br />
              <span className="text-primary">Verify your email</span>
            </h2>
            <p className="text-muted-foreground">
              We need to confirm your email address to keep your account secure.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
