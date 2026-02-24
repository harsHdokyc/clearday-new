/**
 * Application Layout Component
 * 
 * This component provides the main layout structure for authenticated routes.
 * It handles authentication state, loading states, and onboarding flow redirection.
 * 
 * @fileoverview Main application layout with authentication and routing logic
 * @author ClearDay Skincare Team
 * @since 1.0.0
 */

import { Outlet, Navigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Main Application Layout Component
 * 
 * Provides the structural layout for authenticated pages including:
 * - Authentication state management
 * - Loading state handling
 * - Onboarding flow redirection
 * - Responsive layout with sidebar
 * - Page transition animations
 * 
 * @returns JSX element representing the application layout
 * 
 * @since 1.0.0
 */
export function AppLayout(): JSX.Element {
  const isMobile = useIsMobile();
  const { isAuthenticated, isLoading, profile } = useAuth();

  // Show loading state during authentication check
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  /**
   * Onboarding completion check
   * 
   * Logic: Profile is only considered incomplete when BOTH skin_goal AND skin_type are null.
   * This ensures:
   * - Users must complete both fields to create a valid profile
   * - Users with incomplete onboarding (missing both fields) are redirected to onboarding
   * - Users with failed profile fetch (profile = null) can access dashboard (existing users)
   * - Users with at least one field completed can access the app
   * 
   * Note: We allow dashboard access when profile is null because this could be a
   * temporary fetch failure. Existing users shouldn't be blocked from dashboard.
   */
  const shouldRedirectToOnboarding = profile && profile.skin_goal === null && profile.skin_type === null;

  if (shouldRedirectToOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  // Main layout structure with sidebar and content area
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation sidebar */}
      <Sidebar />
      
      {/* Main content area with animations */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={isMobile ? "pt-14 min-h-screen" : "ml-64 min-h-screen"}
      >
        {/* Page content outlet */}
        <Outlet />
      </motion.main>
    </div>
  );
}
