/**
 * Enhanced hooks for the ClearDay Skincare application
 * 
 * This module provides custom React hooks with enhanced functionality,
 * error handling, and performance optimizations.
 * 
 * @fileoverview Enhanced custom React hooks
 * @author ClearDay Skincare Team
 * @since 1.0.0
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CheckIn, UserProfile, ProductEvaluation } from '@/types';
import { STORAGE_CONFIG, AI_CONFIG, HISTORY_CONFIG } from '@/constants';
import { getUserCheckIns, saveCheckIn, uploadPhoto } from '@/lib/storage';
import { evaluateProduct, analyzeSkinProgress } from '@/lib/ai';
import { supabase } from '@/lib/supabase';
import { debounce, calculateStreak, getErrorMessage } from '@/utils';

// ============================================================================
// Enhanced Data Fetching Hooks
// ============================================================================

/**
 * Enhanced hook for fetching user check-ins with caching and error handling
 * 
 * @param userId - User ID to fetch check-ins for
 * @param days - Number of days to fetch (default: 30)
 * @returns Enhanced query result with additional utilities
 */
export function useUserCheckIns(userId: string | undefined, days: number = HISTORY_CONFIG.defaultDays) {
  const queryClient = useQueryClient();
  
  const result = useQuery({
    queryKey: ['check-ins', userId, days],
    queryFn: () => userId ? getUserCheckIns(userId, days) : [],
    enabled: !!userId,
    staleTime: HISTORY_CONFIG.cacheDuration,
    retry: 2,
    retryDelay: 1000,
  });

  /**
   * Invalidate and refetch check-ins
   */
  const refresh = useCallback(() => {
    if (userId) {
      queryClient.invalidateQueries({ queryKey: ['check-ins', userId] });
    }
  }, [queryClient, userId]);

  /**
   * Get streak information from cached data
   */
  const streakInfo = useMemo(() => {
    if (!result.data) return { current: 0, longest: 0, lastCheckIn: null };
    return calculateStreak(result.data);
  }, [result.data]);

  return {
    ...result,
    refresh,
    streakInfo,
  };
}

/**
 * Enhanced hook for creating check-ins with optimistic updates
 * 
 * @param userId - User ID to create check-in for
 * @returns Mutation object with enhanced functionality
 */
export function useCreateCheckIn(userId: string | undefined) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      routine_completed: boolean;
      photo_front?: File | null;
      photo_right?: File | null;
      photo_left?: File | null;
    }) => {
      if (!userId) throw new Error('User ID is required');
      
      // Upload photos first if provided
      const photoUrls: { [key: string]: string | null } = {};
      
      if (data.photo_front) {
        photoUrls.photo_front_url = await uploadPhoto(data.photo_front, userId, 'front');
      }
      if (data.photo_right) {
        photoUrls.photo_right_url = await uploadPhoto(data.photo_right, userId, 'right');
      }
      if (data.photo_left) {
        photoUrls.photo_left_url = await uploadPhoto(data.photo_left, userId, 'left');
      }
      
      // Create check-in record
      return saveCheckIn(userId, {
        front: photoUrls.photo_front_url || undefined,
        right: photoUrls.photo_right_url || undefined,
        left: photoUrls.photo_left_url || undefined,
      }, {
        routineCompleted: data.routine_completed,
      });
    },
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['check-ins', userId] });
      
      // Snapshot the previous value
      const previousCheckIns = queryClient.getQueryData(['check-ins', userId]);
      
      // Optimistically update to the new value
      const optimisticCheckIn = {
        id: `temp-${Date.now()}`,
        user_id: userId!,
        check_in_date: format(new Date(), 'yyyy-MM-dd'),
        routine_completed: newData.routine_completed,
        photo_front_url: null,
        photo_right_url: null,
        photo_left_url: null,
        ai_insight: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      queryClient.setQueryData(['check-ins', userId], (old: CheckIn[] = []) => [
        optimisticCheckIn,
        ...old,
      ]);
      
      return { previousCheckIns };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousCheckIns) {
        queryClient.setQueryData(['check-ins', userId], context.previousCheckIns);
      }
    },
    onSuccess: () => {
      // Refetch on success
      queryClient.invalidateQueries({ queryKey: ['check-ins', userId] });
    },
  });
}

// ============================================================================
// Enhanced AI Hooks
// ============================================================================

/**
 * Enhanced hook for product evaluation with caching and error handling
 * 
 * @param productName - Product name to evaluate
 * @param userSkinType - User's skin type
 * @param userGoals - User's skincare goals
 * @returns Enhanced query result with loading states
 */
export function useProductEvaluation(
  productName: string,
  userSkinType?: string,
  userGoals?: string[]
) {
  return useQuery({
    queryKey: ['product-evaluation', productName, userSkinType, userGoals],
    queryFn: () => evaluateProduct(productName, userSkinType, userGoals),
    enabled: !!productName,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
    retryDelay: 2000,
  });
}

/**
 * Enhanced hook for skin progress analysis
 * 
 * @param photoUrls - Current day photo URLs
 * @param previousDayPhotoUrls - Previous day photo URLs for comparison
 * @returns Enhanced mutation with progress tracking
 */
export function useSkinAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const queryClient = useQueryClient();
  
  const analyzeMutation = useMutation({
    mutationFn: async ({
      photoUrls,
      previousDayPhotoUrls,
      userId,
      date,
    }: {
      photoUrls: { front?: string; right?: string; left?: string };
      previousDayPhotoUrls?: { front?: string; right?: string; left?: string };
      userId: string;
      date: string;
    }) => {
      setIsAnalyzing(true);
      setProgress(25);
      
      try {
        const analysis = await analyzeSkinProgress(photoUrls, previousDayPhotoUrls);
        setProgress(75);
        
        // Save insight to database
        await supabase
          .from('check_ins')
          .update({ ai_insight: analysis.insight })
          .eq('user_id', userId)
          .eq('check_in_date', date);
        
        setProgress(100);
        return analysis;
      } finally {
        setIsAnalyzing(false);
        setProgress(0);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['check-ins', variables.userId] });
    },
  });
  
  return {
    ...analyzeMutation,
    isAnalyzing,
    progress,
  };
}

// ============================================================================
// Enhanced UI Hooks
// ============================================================================

/**
 * Enhanced hook for managing responsive breakpoints
 * 
 * @param breakpoint - Breakpoint to check
 * @returns Boolean indicating if current viewport matches breakpoint
 */
export function useBreakpoint(breakpoint: keyof typeof STORAGE_CONFIG.buckets): boolean {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${breakpoint}px)`);
    
    const handleChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    setMatches(mediaQuery.matches);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [breakpoint]);
  
  return matches;
}

/**
 * Enhanced hook for managing local storage with type safety
 * 
 * @param key - Storage key
 * @param initialValue - Initial value if none exists
 * @returns [value, setValue, removeValue] tuple
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });
  
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);
  
  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);
  
  return [storedValue, setValue, removeValue];
}

/**
 * Enhanced hook for debounced values
 * 
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

/**
 * Enhanced hook for previous value tracking
 * 
 * @param value - Current value to track
 * @returns Previous value
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  });
  
  return ref.current;
}

// ============================================================================
// Enhanced Form Hooks
// ============================================================================

/**
 * Enhanced hook for form validation with real-time feedback
 * 
 * @param initialValues - Initial form values
 * @param validationSchema - Validation rules
 * @returns Enhanced form state and handlers
 */
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationSchema: Record<keyof T, (value: any) => string | null>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const validateField = useCallback((field: keyof T, value: any) => {
    const error = validationSchema[field]?.(value);
    setErrors(prev => ({ ...prev, [field]: error }));
    return !error;
  }, [validationSchema]);
  
  const validateAll = useCallback(() => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;
    
    Object.keys(validationSchema).forEach(field => {
      const key = field as keyof T;
      const error = validationSchema[key]?.(values[key]);
      if (error) {
        newErrors[key] = error;
        isValid = false;
      }
    });
    
    setErrors(newErrors);
    return isValid;
  }, [validationSchema, values]);
  
  const setValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    if (touched[field]) {
      validateField(field, value);
    }
  }, [touched, validateField]);
  
  const setFieldTouched = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, values[field]);
  }, [validateField, values]);
  
  const handleSubmit = useCallback(async (onSubmit: (values: T) => Promise<void>) => {
    setIsSubmitting(true);
    
    try {
      const isValid = validateAll();
      if (!isValid) {
        setIsSubmitting(false);
        return;
      }
      
      await onSubmit(values);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [validateAll, values]);
  
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);
  
  return {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setFieldTouched,
    handleSubmit,
    reset,
    isValid: Object.keys(errors).length === 0,
  };
}

// ============================================================================
// Enhanced Performance Hooks
// ============================================================================

/**
 * Enhanced hook for intersection observer with multiple targets
 * 
 * @param options - Intersection observer options
 * @returns [ref, isIntersecting] tuple
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [(node: Element | null) => void, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [target, setTarget] = useState<Element | null>(null);
  
  useEffect(() => {
    if (!target) return;
    
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);
    
    observer.observe(target);
    
    return () => {
      observer.unobserve(target);
    };
  }, [target, options]);
  
  return [setTarget, isIntersecting];
}

/**
 * Enhanced hook for window size with debounced updates
 * 
 * @returns Window size object
 */
export function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = debounce(() => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }, 250);
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return windowSize;
}

/**
 * Enhanced hook for copy to clipboard functionality
 * 
 * @returns [copy, isCopied] tuple
 */
export function useCopyToClipboard(): [(text: string) => Promise<void>, boolean] {
  const [isCopied, setIsCopied] = useState(false);
  
  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
      setIsCopied(false);
    }
  }, []);
  
  return [copy, isCopied];
}
