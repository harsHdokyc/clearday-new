/**
 * Main Application Component
 * 
 * This is the root component of the ClearDay Skincare application. It sets up all necessary
 * providers and context wrappers for the entire application ecosystem.
 * 
 * @fileoverview Application root with providers setup
 * @author ClearDay Skincare Team
 * @since 1.0.0
 */

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { AppRoutes } from "@/routing";

/**
 * React Query client instance
 * 
 * Configured with default settings for optimal performance and caching behavior.
 * This instance is shared across the entire application for consistent data fetching.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

/**
 * Root Application Component
 * 
 * Wraps the entire application with necessary context providers and sets up routing.
 * Provider order is important for proper context availability.
 * 
 * @returns JSX element representing the complete application structure
 * 
 * @since 1.0.0
 */
const App = (): JSX.Element => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <NotificationProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {/* Toast notifications for user feedback */}
          <Toaster />
          <Sonner />
          
          {/* Router with application routes */}
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </NotificationProvider>
  </ThemeProvider>
);

export default App;
