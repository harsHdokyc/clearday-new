/**
 * Routing Utilities and Hooks
 * 
 * This module provides utility functions and custom hooks for working with
 * application routes, navigation, and route-based logic.
 * 
 * @fileoverview Routing utilities and custom hooks
 * @author ClearDay Skincare Team
 * @since 1.0.0
 */

import { useLocation, useNavigate } from "react-router-dom";
import { ROUTE_CONFIG, PublicRoute, ProtectedRoute, AppRoute } from "./index";

// ============================================================================
// Custom Hooks for Routing
// ============================================================================

/**
 * Hook to get current route information
 * 
 * @returns Current route details including type, key, and path
 * 
 * @example
 * ```tsx
 * const currentRoute = useCurrentRoute();
 * console.log(currentRoute.type); // 'public' | 'protected'
 * console.log(currentRoute.key);  // 'dashboard' | 'login' etc.
 * ```
 */
export const useCurrentRoute = () => {
  const location = useLocation();
  
  const routeConfig = getRouteConfig(location.pathname);
  
  return {
    path: location.pathname,
    type: routeConfig?.type || null,
    key: routeConfig?.key || null,
    isPublic: isPublicRoute(location.pathname),
    isProtected: isProtectedRoute(location.pathname),
    isFallback: location.pathname === ROUTE_CONFIG.fallback,
  };
};

/**
 * Hook for programmatic navigation with type safety
 * 
 * @returns Navigation functions for different route types
 * 
 * @example
 * ```tsx
 * const { goToPublic, goToProtected, goBack } = useTypedNavigation();
 * goToPublic('login');
 * goToProtected('dashboard');
 * ```
 */
export const useTypedNavigation = () => {
  const navigate = useNavigate();
  
  const goToPublic = (route: PublicRoute) => {
    navigate(ROUTE_CONFIG.public[route]);
  };
  
  const goToProtected = (route: ProtectedRoute) => {
    navigate(ROUTE_CONFIG.protected[route]);
  };
  
  const goToPath = (path: string) => {
    navigate(path);
  };
  
  const goBack = () => {
    navigate(-1);
  };
  
  const goForward = () => {
    navigate(1);
  };
  
  const replaceWith = (path: string) => {
    navigate(path, { replace: true });
  };
  
  return {
    goToPublic,
    goToProtected,
    goToPath,
    goBack,
    goForward,
    replaceWith,
  };
};

/**
 * Hook to check if current user can access current route
 * 
 * @param isAuthenticated - Whether user is authenticated
 * @returns Object with access permissions and redirect suggestions
 * 
 * @example
 * ```tsx
 * const { canAccess, shouldRedirect, redirectTo } = useRouteAccess(isAuthenticated);
 * if (shouldRedirect) {
 *   navigate(redirectTo);
 * }
 * ```
 */
export const useRouteAccess = (isAuthenticated: boolean) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const isCurrentRoutePublic = isPublicRoute(location.pathname);
  const isCurrentRouteProtected = isProtectedRoute(location.pathname);
  
  const canAccess = isAuthenticated ? true : isCurrentRoutePublic;
  const shouldRedirect = !canAccess;
  
  let redirectTo = '/login';
  
  if (isAuthenticated && isCurrentRoutePublic) {
    // Authenticated user on public route - redirect to dashboard
    redirectTo = ROUTE_CONFIG.protected.dashboard;
  } else if (!isAuthenticated && isCurrentRouteProtected) {
    // Unauthenticated user on protected route - redirect to login
    redirectTo = ROUTE_CONFIG.public.login;
  }
  
  return {
    canAccess,
    shouldRedirect,
    redirectTo,
    isCurrentRoutePublic,
    isCurrentRouteProtected,
  };
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Import the route configuration and helper functions from the main routing module
 */
import { isPublicRoute, isProtectedRoute, getRouteConfig } from "./index";

/**
 * Get all public routes as an array of paths
 * 
 * @returns Array of public route paths
 */
export const getPublicRoutes = (): string[] => {
  return Object.values(ROUTE_CONFIG.public);
};

/**
 * Get all protected routes as an array of paths
 * 
 * @returns Array of protected route paths
 */
export const getProtectedRoutes = (): string[] => {
  return Object.values(ROUTE_CONFIG.protected);
};

/**
 * Get all application routes as an array of paths
 * 
 * @returns Array of all route paths
 */
export const getAllRoutes = (): string[] => {
  return [...getPublicRoutes(), ...getProtectedRoutes()];
};

/**
 * Check if a path matches any application route
 * 
 * @param path - Path to check
 * @returns True if path matches a known route
 */
export const isValidRoute = (path: string): boolean => {
  return getAllRoutes().includes(path) || path === ROUTE_CONFIG.fallback;
};

/**
 * Get route key by path
 * 
 * @param path - Route path
 * @returns Route key or null if not found
 */
export const getRouteKey = (path: string): PublicRoute | ProtectedRoute | null => {
  const config = getRouteConfig(path);
  return config?.key as PublicRoute | ProtectedRoute | null;
};

/**
 * Generate breadcrumb data for current route
 * 
 * @param path - Current path
 * @returns Array of breadcrumb items
 */
export const generateBreadcrumbs = (path: string): Array<{ label: string; path: string }> => {
  const breadcrumbs = [{ label: 'Home', path: '/' }];
  
  if (path === '/') {
    return breadcrumbs;
  }
  
  const segments = path.split('/').filter(Boolean);
  let currentPath = '';
  
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const routeConfig = getRouteConfig(currentPath);
    
    if (routeConfig) {
      // Convert route key to readable label
      const label = routeConfig.key
        .split(/(?=[A-Z])/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      breadcrumbs.push({ label, path: currentPath });
    } else {
      // For dynamic routes, use the segment as label
      const label = segment
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      breadcrumbs.push({ label, path: currentPath });
    }
  });
  
  return breadcrumbs;
};

/**
 * Route guard for authentication
 * 
 * @param isAuthenticated - Whether user is authenticated
 * @param currentPath - Current route path
 * @returns Redirect path if authentication is required, null otherwise
 */
export const getAuthRedirect = (isAuthenticated: boolean, currentPath: string): string | null => {
  if (isAuthenticated && isPublicRoute(currentPath) && currentPath !== '/') {
    // Authenticated user trying to access public routes (except landing)
    return ROUTE_CONFIG.protected.dashboard;
  }
  
  if (!isAuthenticated && isProtectedRoute(currentPath)) {
    // Unauthenticated user trying to access protected routes
    return ROUTE_CONFIG.public.login;
  }
  
  return null;
};

/**
 * Default export
 */
export default {
  useCurrentRoute,
  useTypedNavigation,
  useRouteAccess,
  getPublicRoutes,
  getProtectedRoutes,
  getAllRoutes,
  isValidRoute,
  getRouteKey,
  generateBreadcrumbs,
  getAuthRedirect,
};
