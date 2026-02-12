/**
 * Utility functions for CSS class management
 * 
 * This module provides a centralized utility for combining and managing CSS classes
 * using clsx for conditional class names and tailwind-merge for Tailwind CSS optimization.
 * 
 * @fileoverview Centralized CSS class management utilities
 * @author ClearDay Skincare Team
 * @since 1.0.0
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines and optimizes CSS class names
 * 
 * This function merges class names using clsx for conditional classes and tailwind-merge
 * to resolve Tailwind CSS conflicts, ensuring the final class string is optimized.
 * 
 * @param inputs - Variable number of class value inputs (strings, objects, arrays)
 * @returns Optimized string of CSS classes
 * 
 * @example
 * ```tsx
 * cn('base-class', { 'active': isActive }, 'additional-class')
 * // Returns: 'base-class additional-class active' (if isActive is true)
 * ```
 * 
 * @since 1.0.0
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
