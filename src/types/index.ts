/**
 * Type definitions for the ClearDay Skincare application
 * 
 * This module contains all shared TypeScript interfaces and types used throughout
 * the application to ensure type safety and consistency.
 * 
 * @fileoverview Centralized type definitions for the application
 * @author ClearDay Skincare Team
 * @since 1.0.0
 */

// ============================================================================
// User & Authentication Types
// ============================================================================

/**
 * User profile information
 * 
 * Represents the user's skincare profile and preferences
 */
export interface UserProfile {
  id: string;
  email: string;
  skin_type: SkinType | null;
  skin_goal: SkinGoal | null;
  created_at: string;
  updated_at: string;
}

/**
 * Supported skin types
 */
export type SkinType = 'oily' | 'dry' | 'combination' | 'sensitive' | 'normal';

/**
 * Supported skincare goals
 */
export type SkinGoal = 'acne' | 'glow' | 'hydrate' | 'protect';

// ============================================================================
// Check-in Types
// ============================================================================

/**
 * Daily check-in data structure
 * 
 * Represents a user's daily skincare tracking entry
 */
export interface CheckIn {
  id: string;
  user_id: string;
  check_in_date: string;
  routine_completed: boolean;
  photo_front_url?: string | null;
  photo_right_url?: string | null;
  photo_left_url?: string | null;
  ai_insight?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Form data for creating/updating check-ins
 */
export interface CheckInFormData {
  routine_completed: boolean;
  photo_front?: File | null;
  photo_right?: File | null;
  photo_left?: File | null;
}

// ============================================================================
// AI & Analytics Types
// ============================================================================

/**
 * Product evaluation result from AI analysis
 */
export interface ProductEvaluation {
  fitScore: number;
  verdict: 'great' | 'good' | 'caution';
  insights: string[];
  recommendation: string;
}

/**
 * Skin progress metrics from AI analysis
 */
export interface SkinProgressMetrics {
  label: string;
  value: number;
  trend: 'up' | 'down' | 'neutral';
  isGood: boolean;
}

/**
 * Complete skin progress analysis result
 */
export interface SkinProgressAnalysis {
  metrics: SkinProgressMetrics[];
  insight: string;
}

/**
 * Progress tracking data point
 */
export interface ProgressData {
  label: string;
  value: number;
  trend: 'up' | 'down';
}

// ============================================================================
// UI Component Types
// ============================================================================

/**
 * Base component props with optional className
 */
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Loading state variants
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * View mode options for data display
 */
export type ViewMode = 'grid' | 'list';

/**
 * Theme variants
 */
export type Theme = 'light' | 'dark' | 'system';

// ============================================================================
// API & Service Types
// ============================================================================

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

/**
 * Error information structure
 */
export interface AppError {
  message: string;
  code?: string;
  details?: Record<string, any>;
}

/**
 * Storage service configuration
 */
export interface StorageConfig {
  bucket: string;
  maxSize: number;
  allowedTypes: string[];
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Optional partial type for updates
 */
export type PartialUpdate<T> = Partial<Pick<T, keyof T>>;

/**
 * ID-based entity
 */
export interface EntityWithId {
  id: string;
}

/**
 * Timestamped entity
 */
export interface TimestampedEntity {
  created_at: string;
  updated_at: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================================
// Component Specific Types
// ============================================================================

/**
 * History entry for calendar view
 */
export interface HistoryEntry {
  date: Date;
  completed: boolean;
  photoUrl: string | null;
  insight: string | null;
  routineSteps: number;
  photoFrontUrl?: string | null;
  photoRightUrl?: string | null;
  photoLeftUrl?: string | null;
}

/**
 * Journey data point
 */
export interface JourneyDataPoint {
  date: string;
  score: number;
  completed: boolean;
  hasPhotos: boolean;
}

/**
 * Streak information
 */
export interface StreakInfo {
  current: number;
  longest: number;
  lastCheckIn: string | null;
}

// ============================================================================
// Type Guards and Utilities
// ============================================================================

/**
 * Type guard for skin type validation
 */
export function isValidSkinType(value: unknown): value is SkinType {
  return ['oily', 'dry', 'combination', 'sensitive', 'normal'].includes(value as string);
}

/**
 * Type guard for skin goal validation
 */
export function isValidSkinGoal(value: unknown): value is SkinGoal {
  return ['acne', 'glow', 'hydrate', 'protect'].includes(value as string);
}

/**
 * Type guard for product verdict validation
 */
export function isValidVerdict(value: unknown): value is 'great' | 'good' | 'caution' {
  return ['great', 'good', 'caution'].includes(value as string);
}
