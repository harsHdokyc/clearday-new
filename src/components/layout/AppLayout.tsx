import { Outlet, Navigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";

export function AppLayout() {
  const isMobile = useIsMobile();
  const { isAuthenticated, isLoading, profile } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has completed onboarding
  // Only redirect to onboarding if profile exists but both skin_goal and skin_type are null
  // This means the user started onboarding but didn't complete it
  // If profile is null (fetch failed) or has at least one field, allow dashboard access
  if (profile && profile.skin_goal === null && profile.skin_type === null) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={isMobile ? "pt-14 min-h-screen" : "ml-64 min-h-screen"}
      >
        <Outlet />
      </motion.main>
    </div>
  );
}
