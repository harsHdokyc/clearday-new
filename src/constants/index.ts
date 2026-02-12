/**
 * Constants and configuration for the ClearDay Skincare application
 * 
 * This module contains all shared constants, configuration values, and enums
 * used throughout the application for consistency and maintainability.
 * 
 * @fileoverview Centralized constants and configuration
 * @author ClearDay Skincare Team
 * @since 1.0.0
 */

// ============================================================================
// Application Configuration
// ============================================================================

/**
 * Application metadata
 */
export const APP_CONFIG = {
  name: 'ClearDay Skincare',
  version: '1.0.0',
  description: 'Personalized skincare tracking and insights',
  author: 'ClearDay Skincare Team',
} as const;

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  // Authentication
  auth: {
    login: '/auth/login',
    signup: '/auth/signup',
    logout: '/auth/logout',
    verify: '/auth/verify-email',
    reset: '/auth/reset-password',
  },
  // User data
  user: {
    profile: '/user/profile',
    checkIns: '/user/check-ins',
    stats: '/user/stats',
  },
  // Storage
  storage: {
    upload: '/storage/upload',
    delete: '/storage/delete',
  },
} as const;

/**
 * Storage configuration
 */
export const STORAGE_CONFIG = {
  buckets: {
    photos: 'user-photos',
    avatars: 'user-avatars',
  },
  limits: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 3, // per check-in
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
} as const;

// ============================================================================
// UI Constants
// ============================================================================

/**
 * Animation durations and easing
 */
export const ANIMATION = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
} as const;

/**
 * Breakpoint values for responsive design
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * Z-index scale for layer management
 */
export const Z_INDEX = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modal: 1300,
  popover: 1400,
  tooltip: 1500,
  toast: 1600,
} as const;

// ============================================================================
// Business Logic Constants
// ============================================================================

/**
 * Skin type information
 */
export const SKIN_TYPES = {
  oily: {
    label: 'Oily',
    description: 'Excess oil production, prone to shine and breakouts',
    concerns: ['acne', 'enlarged pores', 'shine'],
    recommendations: ['oil-free', 'non-comedogenic', 'salicylic acid'],
  },
  dry: {
    label: 'Dry',
    description: 'Lacks moisture, prone to flaking and tightness',
    concerns: ['flakiness', 'tightness', 'fine lines'],
    recommendations: ['hydrating', 'ceramides', 'hyaluronic acid'],
  },
  combination: {
    label: 'Combination',
    description: 'Oily in some areas, dry in others',
    concerns: ['uneven texture', 't-zone oiliness', 'dry cheeks'],
    recommendations: ['balanced', 'lightweight', 'targeted treatment'],
  },
  sensitive: {
    label: 'Sensitive',
    description: 'Easily irritated, prone to redness and reactions',
    concerns: ['redness', 'irritation', 'allergic reactions'],
    recommendations: ['fragrance-free', 'hypoallergenic', 'gentle'],
  },
  normal: {
    label: 'Normal',
    description: 'Well-balanced, not too oily or dry',
    concerns: ['maintenance', 'prevention'],
    recommendations: ['balanced', 'preventive', 'gentle'],
  },
} as const;

/**
 * Skincare goals and their focus areas
 */
export const SKIN_GOALS = {
  acne: {
    label: 'Acne Treatment',
    description: 'Reduce breakouts and clear skin',
    focus: ['blemish control', 'oil regulation', 'pore care'],
    keyIngredients: ['salicylic acid', 'benzoyl peroxide', 'retinoids'],
  },
  glow: {
    label: 'Radiant Glow',
    description: 'Achieve healthy, glowing skin',
    focus: ['brightness', 'even tone', 'texture'],
    keyIngredients: ['vitamin C', 'niacinamide', 'alpha hydroxy acids'],
  },
  hydrate: {
    label: 'Hydration',
    description: 'Maintain optimal moisture levels',
    focus: ['moisture retention', 'barrier support', 'plumping'],
    keyIngredients: ['hyaluronic acid', 'glycerin', 'ceramides'],
  },
  protect: {
    label: 'Protection',
    description: 'Shield skin from environmental damage',
    focus: ['antioxidants', 'sun protection', 'barrier defense'],
    keyIngredients: ['SPF', 'antioxidants', 'niacinamide'],
  },
} as const;

/**
 * Routine steps for daily tracking
 */
export const ROUTINE_STEPS = {
  cleanse: {
    id: 'cleanse',
    label: 'Cleanse',
    description: 'Remove dirt, oil, and impurities',
    order: 1,
  },
  treat: {
    id: 'treat',
    label: 'Treat',
    description: 'Apply targeted treatments or serums',
    order: 2,
  },
  moisturize: {
    id: 'moisturize',
    label: 'Moisturize',
    description: 'Hydrate and protect the skin',
    order: 3,
  },
  protect: {
    id: 'protect',
    label: 'Protect',
    description: 'Apply sunscreen (AM routine)',
    order: 4,
    optional: true,
  },
} as const;

// ============================================================================
// Data & Analytics Constants
// ============================================================================

/**
 * History tracking configuration
 */
export const HISTORY_CONFIG = {
  defaultDays: 30,
  maxDays: 365,
  weekDays: 7,
  cacheDuration: 5 * 60 * 1000, // 5 minutes
} as const;

/**
 * Streak calculation rules
 */
export const STREAK_RULES = {
  resetHours: 24, // Hours after which streak resets
  gracePeriod: 2, // Grace period in hours
  maxStreak: 1000, // Maximum streak display
} as const;

/**
 * AI analysis configuration
 */
export const AI_CONFIG = {
  models: {
    default: 'claude-sonnet-4-5',
    fast: 'claude-haiku-4-5',
  },
  timeouts: {
    generation: 30000, // 30 seconds
    streaming: 60000, // 60 seconds
  },
  retries: {
    max: 2,
    delay: 1000, // 1 second
  },
} as const;

// ============================================================================
// Validation Rules
// ============================================================================

/**
 * Form validation rules
 */
export const VALIDATION_RULES = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 255,
  },
  password: {
    required: true,
    minLength: 8,
    maxLength: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, // At least one lowercase, uppercase, and number
  },
  username: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_-]+$/,
  },
  file: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
} as const;

// ============================================================================
// Error Messages
// ============================================================================

/**
 * User-friendly error messages
 */
export const ERROR_MESSAGES = {
  network: 'Network connection error. Please check your internet connection.',
  auth: {
    invalidCredentials: 'Invalid email or password. Please try again.',
    sessionExpired: 'Your session has expired. Please log in again.',
    emailNotVerified: 'Please verify your email address before continuing.',
    accountExists: 'An account with this email already exists.',
  },
  storage: {
    fileTooLarge: 'File size exceeds the maximum limit of 5MB.',
    invalidFileType: 'Invalid file type. Please upload JPEG, PNG, or WebP images.',
    uploadFailed: 'Failed to upload file. Please try again.',
    quotaExceeded: 'Storage quota exceeded. Please delete some files to continue.',
  },
  ai: {
    serviceUnavailable: 'AI service is temporarily unavailable. Please try again later.',
    analysisFailed: 'Failed to analyze image. Please try uploading again.',
    rateLimited: 'Too many requests. Please wait a moment before trying again.',
  },
  general: {
    unexpected: 'An unexpected error occurred. Please try again.',
    notFound: 'The requested resource was not found.',
    forbidden: 'You do not have permission to perform this action.',
  },
} as const;

// ============================================================================
// Success Messages
// ============================================================================

/**
 * User-friendly success messages
 */
export const SUCCESS_MESSAGES = {
  auth: {
    login: 'Successfully logged in!',
    signup: 'Account created successfully!',
    logout: 'Successfully logged out.',
    emailVerified: 'Email verified successfully!',
  },
  profile: {
    updated: 'Profile updated successfully!',
    onboardingComplete: 'Onboarding completed! Welcome to ClearDay.',
  },
  checkIn: {
    created: 'Check-in completed successfully!',
    updated: 'Check-in updated successfully!',
    deleted: 'Check-in deleted successfully.',
  },
  storage: {
    uploaded: 'File uploaded successfully!',
    deleted: 'File deleted successfully.',
  },
  ai: {
    analysisComplete: 'AI analysis completed successfully!',
    insightGenerated: 'Personalized insight generated!',
  },
} as const;

// ============================================================================
// Utility Constants
// ============================================================================

/**
 * Date formatting options
 */
export const DATE_FORMATS = {
  full: 'EEEE, MMMM d, yyyy',
  short: 'MMM d, yyyy',
  time: 'h:mm a',
  datetime: 'MMM d, yyyy h:mm a',
  iso: 'yyyy-MM-dd',
  calendar: 'yyyy-MM-dd',
} as const;

/**
 * Number formatting options
 */
export const NUMBER_FORMATS = {
  percentage: {
    style: 'percent' as const,
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  },
  decimal: {
    style: 'decimal' as const,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  },
} as const;
