/**
 * Application Routing Configuration
 * 
 * This module contains all routing configuration for the ClearDay Skincare application.
 * It separates routing logic from the main App component for better maintainability
 * and follows the single responsibility principle.
 * 
 * @fileoverview Centralized routing configuration
 * @author ClearDay Skincare Team
 * @since 1.0.0
 */

import { Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";

// Page component imports
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import SignUp from "@/pages/SignUp";
import EmailVerification from "@/pages/EmailVerification";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import History from "@/pages/History";
import Products from "@/pages/Products";
import Journey from "@/pages/Journey";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

/**
 * Application Routes Component
 * 
 * Renders all application routes with proper organization:
 * - Public routes (accessible without authentication)
 * - Protected routes (require authentication and use AppLayout)
 * - Fallback routes (404 handling)
 * 
 * @returns JSX element containing all application routes
 * 
 * @since 1.0.0
 */
export const AppRoutes = (): JSX.Element => {
  return (
    <Routes>
      {/* 
        Public Routes
        These routes are accessible without authentication
      */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/verify-email" element={<EmailVerification />} />
      <Route path="/onboarding" element={<Onboarding />} />
      
      {/* 
        Protected Routes
        These routes require authentication and use the AppLayout wrapper
        The AppLayout component handles authentication checks and redirects
      */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/history" element={<History />} />
        <Route path="/products" element={<Products />} />
        <Route path="/journey" element={<Journey />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      
      {/* 
        Fallback Route
        Catches all unmatched routes and displays the 404 page
      */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

/**
 * Route Configuration Object
 * 
 * Provides programmatic access to route information for utilities,
 * navigation generation, and testing purposes.
 */
export const ROUTE_CONFIG = {
  // Public routes (no authentication required)
  public: {
    landing: '/',
    login: '/login',
    signup: '/signup',
    emailVerification: '/verify-email',
    onboarding: '/onboarding',
  },
  
  // Protected routes (authentication required)
  protected: {
    dashboard: '/dashboard',
    history: '/history',
    products: '/products',
    journey: '/journey',
    settings: '/settings',
  },
  
  // Utility routes
  fallback: '*',
} as const;

/**
 * Route type definitions for type safety
 */
export type PublicRoute = keyof typeof ROUTE_CONFIG.public;
export type ProtectedRoute = keyof typeof ROUTE_CONFIG.protected;
export type AppRoute = PublicRoute | ProtectedRoute;

/**
 * Helper function to check if a route is public
 * 
 * @param route - Route path to check
 * @returns True if route is public (no authentication required)
 * 
 * @since 1.0.0
 */
export const isPublicRoute = (route: string): boolean => {
  return Object.values(ROUTE_CONFIG.public).includes(route as any);
};

/**
 * Helper function to check if a route is protected
 * 
 * @param route - Route path to check
 * @returns True if route is protected (authentication required)
 * 
 * @since 1.0.0
 */
export const isProtectedRoute = (route: string): boolean => {
  return Object.values(ROUTE_CONFIG.protected).includes(route as any);
};

/**
 * Helper function to get route configuration by path
 * 
 * @param path - Route path
 * @returns Route configuration object or null if not found
 * 
 * @since 1.0.0
 */
export const getRouteConfig = (path: string) => {
  const publicRoute = Object.entries(ROUTE_CONFIG.public).find(([_, route]) => route === path);
  if (publicRoute) {
    return { type: 'public' as const, key: publicRoute[0], path: publicRoute[1] };
  }
  
  const protectedRoute = Object.entries(ROUTE_CONFIG.protected).find(([_, route]) => route === path);
  if (protectedRoute) {
    return { type: 'protected' as const, key: protectedRoute[0], path: protectedRoute[1] };
  }
  
  return null;
};

/**
 * Default export for convenience
 */
export default AppRoutes;
