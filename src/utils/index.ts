/**
 * Utility functions for the ClearDay Skincare application
 * 
 * This module provides common utility functions used throughout the application
 * for data manipulation, validation, formatting, and common operations.
 * 
 * @fileoverview Shared utility functions
 * @author ClearDay Skincare Team
 * @since 1.0.0
 */

import { format, parseISO, isSameDay, subDays, startOfDay, endOfDay } from 'date-fns';
import { SkinType, SkinGoal, CheckIn, HistoryEntry } from '@/types';
import { DATE_FORMATS, VALIDATION_RULES, STREAK_RULES } from '@/constants';

// ============================================================================
// Date Utilities
// ============================================================================

/**
 * Format a date string or Date object to a specified format
 * 
 * @param date - Date object or ISO string to format
 * @param formatString - Format string (defaults to short format)
 * @returns Formatted date string
 * 
 * @example
 * formatDate(new Date(), DATE_FORMATS.full) // "Monday, January 1, 2024"
 */
export function formatDate(
  date: Date | string, 
  formatString: string = DATE_FORMATS.short
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatString);
}

/**
 * Check if two dates are the same day
 * 
 * @param date1 - First date to compare
 * @param date2 - Second date to compare
 * @returns True if dates are the same day
 */
export function isSameDayCheck(date1: Date | string, date2: Date | string): boolean {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  return isSameDay(d1, d2);
}

/**
 * Get the start and end of day for a given date
 * 
 * @param date - Date to get boundaries for
 * @returns Object with startOfDay and endOfDay Date objects
 */
export function getDayBoundaries(date: Date): { start: Date; end: Date } {
  return {
    start: startOfDay(date),
    end: endOfDay(date),
  };
}

/**
 * Generate an array of dates for the last N days
 * 
 * @param days - Number of days to generate
 * @returns Array of Date objects from today back N days
 */
export function getLastNDays(days: number): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < days; i++) {
    dates.push(subDays(new Date(), i));
  }
  return dates;
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate email format
 * 
 * @param email - Email string to validate
 * @returns True if email is valid format
 */
export function isValidEmail(email: string): boolean {
  const pattern = VALIDATION_RULES.email.pattern;
  return pattern.test(email) && email.length <= VALIDATION_RULES.email.maxLength;
}

/**
 * Validate password strength
 * 
 * @param password - Password string to validate
 * @returns Object with validation result and error message
 */
export function validatePassword(password: string): { isValid: boolean; message?: string } {
  const rules = VALIDATION_RULES.password;
  
  if (password.length < rules.minLength) {
    return { isValid: false, message: `Password must be at least ${rules.minLength} characters long` };
  }
  
  if (password.length > rules.maxLength) {
    return { isValid: false, message: `Password must be no more than ${rules.maxLength} characters long` };
  }
  
  if (!rules.pattern.test(password)) {
    return { 
      isValid: false, 
      message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number' 
    };
  }
  
  return { isValid: true };
}

/**
 * Validate file for upload
 * 
 * @param file - File object to validate
 * @returns Object with validation result and error message
 */
export function validateFile(file: File): { isValid: boolean; message?: string } {
  const rules = VALIDATION_RULES.file;
  
  if (file.size > rules.maxSize) {
    return { 
      isValid: false, 
      message: `File size must be less than ${Math.round(rules.maxSize / 1024 / 1024)}MB` 
    };
  }
  
  if (!rules.allowedTypes.includes(file.type as typeof rules.allowedTypes[number])) {
    return { 
      isValid: false, 
      message: 'File must be JPEG, PNG, or WebP format' 
    };
  }
  
  return { isValid: true };
}

// ============================================================================
// Data Transformation Utilities
// ============================================================================

/**
 * Transform database check-in data to HistoryEntry format
 * 
 * @param checkIn - Raw check-in data from database
 * @returns Transformed HistoryEntry object
 */
export function transformCheckInToHistoryEntry(checkIn: CheckIn): HistoryEntry {
  const photoUrl = checkIn.photo_front_url || checkIn.photo_right_url || checkIn.photo_left_url || null;
  
  return {
    date: parseISO(checkIn.check_in_date),
    completed: !!(checkIn.routine_completed || photoUrl),
    photoUrl,
    photoFrontUrl: checkIn.photo_front_url,
    photoRightUrl: checkIn.photo_right_url,
    photoLeftUrl: checkIn.photo_left_url,
    insight: checkIn.ai_insight || null,
    routineSteps: checkIn.routine_completed ? 3 : 0,
  };
}

/**
 * Calculate completion rate from history data
 * 
 * @param historyData - Array of history entries
 * @returns Completion rate as percentage (0-100)
 */
export function calculateCompletionRate(historyData: HistoryEntry[]): number {
  if (historyData.length === 0) return 0;
  
  const completedDays = historyData.filter(entry => entry.completed).length;
  return Math.round((completedDays / historyData.length) * 100);
}

/**
 * Calculate streak information from check-in data
 * 
 * @param checkIns - Array of check-in data
 * @returns Streak information object
 */
export function calculateStreak(checkIns: CheckIn[]): { current: number; longest: number; lastCheckIn: string | null } {
  if (checkIns.length === 0) {
    return { current: 0, longest: 0, lastCheckIn: null };
  }
  
  // Sort by date descending
  const sortedCheckIns = checkIns
    .filter(ci => ci.routine_completed)
    .sort((a, b) => new Date(b.check_in_date).getTime() - new Date(a.check_in_date).getTime());
  
  if (sortedCheckIns.length === 0) {
    return { current: 0, longest: 0, lastCheckIn: null };
  }
  
  let currentStreak = 1;
  let longestStreak = 1;
  let tempStreak = 1;
  
  const lastCheckIn = sortedCheckIns[0].check_in_date;
  const lastDate = new Date(lastCheckIn);
  const now = new Date();
  
  // Check if streak is still active (within reset window)
  const hoursSinceLastCheckIn = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
  if (hoursSinceLastCheckIn > STREAK_RULES.resetHours) {
    currentStreak = 0;
  }
  
  // Calculate current and longest streaks
  for (let i = 1; i < sortedCheckIns.length; i++) {
    const currentDate = new Date(sortedCheckIns[i - 1].check_in_date);
    const previousDate = new Date(sortedCheckIns[i].check_in_date);
    
    const daysDiff = Math.abs(currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff <= 1) {
      tempStreak++;
      if (i === 1 && currentStreak > 0) {
        currentStreak++;
      }
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
      if (i === 1) {
        currentStreak = 1;
      }
    }
  }
  
  longestStreak = Math.max(longestStreak, tempStreak);
  
  return {
    current: currentStreak,
    longest: longestStreak,
    lastCheckIn,
  };
}

// ============================================================================
// String Utilities
// ============================================================================

/**
 * Capitalize the first letter of a string
 * 
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Truncate a string to a specified length with ellipsis
 * 
 * @param str - String to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated string with ellipsis if needed
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Convert a string to title case
 * 
 * @param str - String to convert
 * @returns Title case string
 */
export function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

// ============================================================================
// Array Utilities
// ============================================================================

/**
 * Remove duplicates from an array based on a key
 * 
 * @param array - Array to deduplicate
 * @param key - Key to check for uniqueness
 * @returns Deduplicated array
 */
export function deduplicateBy<T>(array: T[], key: keyof T): T[] {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

/**
 * Sort an array of objects by a key
 * 
 * @param array - Array to sort
 * @param key - Key to sort by
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns Sorted array
 */
export function sortByKey<T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Group an array of objects by a key
 * 
 * @param array - Array to group
 * @param key - Key to group by
 * @returns Object with grouped arrays
 */
export function groupByKey<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

// ============================================================================
// Storage Utilities
// ============================================================================

/**
 * Safely parse JSON from localStorage
 * 
 * @param key - localStorage key
 * @returns Parsed data or null if invalid
 */
export function getFromLocalStorage<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error parsing localStorage key "${key}":`, error);
    return null;
  }
}

/**
 * Safely save JSON to localStorage
 * 
 * @param key - localStorage key
 * @param data - Data to save
 * @returns True if successful
 */
export function setToLocalStorage<T>(key: string, data: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Error saving to localStorage key "${key}":`, error);
    return false;
  }
}

/**
 * Remove item from localStorage
 * 
 * @param key - localStorage key to remove
 * @returns True if successful
 */
export function removeFromLocalStorage(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing localStorage key "${key}":`, error);
    return false;
  }
}

// ============================================================================
// Performance Utilities
// ============================================================================

/**
 * Debounce a function call
 * 
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T, 
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Throttle a function call
 * 
 * @param func - Function to throttle
 * @param delay - Delay in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T, 
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

/**
 * Create a memoized version of a function
 * 
 * @param func - Function to memoize
 * @returns Memoized function
 */
export function memoize<T extends (...args: any[]) => any>(func: T): T {
  const cache = new Map();
  
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Create a standardized error object
 * 
 * @param message - Error message
 * @param code - Optional error code
 * @param details - Optional error details
 * @returns Standardized error object
 */
export function createError(
  message: string, 
  code?: string, 
  details?: Record<string, any>
): { message: string; code?: string; details?: Record<string, any> } {
  return { message, code, details };
}

/**
 * Check if an object is a valid error
 * 
 * @param error - Object to check
 * @returns True if object is a valid error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error && typeof error.message === 'string';
}

/**
 * Get a user-friendly error message
 * 
 * @param error - Error object or string
 * @param fallback - Fallback message
 * @returns User-friendly error message
 */
export function getErrorMessage(error: unknown, fallback: string = 'An unexpected error occurred'): string {
  if (isError(error)) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return fallback;
}
