/**
 * Enhanced error handling and logging system
 * 
 * This module provides comprehensive error handling, logging, and debugging
 * capabilities with structured error reporting and user-friendly error messages.
 * 
 * @fileoverview Enhanced error handling and logging system
 * @author ClearDay Skincare Team
 * @since 1.0.0
 */

import React from 'react';

// ============================================================================
// Error Types and Interfaces
// ============================================================================

/**
 * Base error class for application-specific errors
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context?: Record<string, any>;
  public readonly timestamp: Date;
  public readonly userId?: string;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    category: ErrorCategory = 'general',
    severity: ErrorSeverity = 'medium',
    context?: Record<string, any>,
    userId?: string
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date();
    this.userId = userId;

    // Ensure stack trace is properly captured
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Convert error to JSON for logging/serialization
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      userId: this.userId,
      stack: this.stack,
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return ERROR_MESSAGES[this.category]?.[this.code] || this.message;
  }
}

/**
 * Error categories for classification
 */
export type ErrorCategory = 
  | 'auth'
  | 'api'
  | 'storage'
  | 'validation'
  | 'network'
  | 'ai'
  | 'ui'
  | 'general';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Log levels for logging system
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Log entry structure
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  category?: string;
  context?: Record<string, any>;
  error?: Error;
  userId?: string;
  sessionId?: string;
}

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  enableConsoleLogging: boolean;
  enableRemoteLogging: boolean;
  logLevel: LogLevel;
  maxLogEntries: number;
  remoteEndpoint?: string;
  sampleRate: number; // 0-1, percentage of errors to log remotely
}

// ============================================================================
// Error Message Constants
// ============================================================================

/**
 * User-friendly error messages by category and code
 */
const ERROR_MESSAGES: Record<ErrorCategory, Record<string, string>> = {
  auth: {
    INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
    SESSION_EXPIRED: 'Your session has expired. Please log in again.',
    EMAIL_NOT_VERIFIED: 'Please verify your email address before continuing.',
    ACCOUNT_EXISTS: 'An account with this email already exists.',
    NETWORK_ERROR: 'Network connection error. Please check your internet connection.',
    UNKNOWN_ERROR: 'Authentication error. Please try again.',
  },
  api: {
    NETWORK_ERROR: 'Network connection error. Please check your internet connection.',
    TIMEOUT_ERROR: 'Request timed out. Please try again.',
    SERVER_ERROR: 'Server error. Please try again later.',
    NOT_FOUND: 'The requested resource was not found.',
    FORBIDDEN: 'You do not have permission to perform this action.',
    UNKNOWN_ERROR: 'API error. Please try again.',
  },
  storage: {
    FILE_TOO_LARGE: 'File size exceeds the maximum limit of 5MB.',
    INVALID_FILE_TYPE: 'Invalid file type. Please upload JPEG, PNG, or WebP images.',
    UPLOAD_FAILED: 'Failed to upload file. Please try again.',
    QUOTA_EXCEEDED: 'Storage quota exceeded. Please delete some files to continue.',
    UNKNOWN_ERROR: 'Storage error. Please try again.',
  },
  validation: {
    INVALID_EMAIL: 'Please enter a valid email address.',
    INVALID_PASSWORD: 'Password must be at least 8 characters long.',
    REQUIRED_FIELD: 'This field is required.',
    INVALID_FORMAT: 'Invalid format. Please check your input.',
    UNKNOWN_ERROR: 'Validation error. Please check your input.',
  },
  network: {
    OFFLINE: 'You appear to be offline. Please check your internet connection.',
    TIMEOUT: 'Connection timeout. Please try again.',
    UNKNOWN_ERROR: 'Network error. Please try again.',
  },
  ai: {
    SERVICE_UNAVAILABLE: 'AI service is temporarily unavailable. Please try again later.',
    ANALYSIS_FAILED: 'Failed to analyze image. Please try uploading again.',
    RATE_LIMITED: 'Too many requests. Please wait a moment before trying again.',
    UNKNOWN_ERROR: 'AI service error. Please try again.',
  },
  ui: {
    COMPONENT_ERROR: 'Component error. Please refresh the page.',
    RENDER_ERROR: 'Display error. Please try again.',
    UNKNOWN_ERROR: 'Interface error. Please refresh the page.',
  },
  general: {
    UNEXPECTED_ERROR: 'An unexpected error occurred. Please try again.',
    UNKNOWN_ERROR: 'An error occurred. Please try again.',
  },
};

// ============================================================================
// Logger Class
// ============================================================================

/**
 * Enhanced logging system with structured logging and error tracking
 */
export class Logger {
  private config: ErrorHandlerConfig;
  private logEntries: LogEntry[] = [];
  private sessionId: string;

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      enableConsoleLogging: true,
      enableRemoteLogging: process.env.NODE_ENV === 'production',
      logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
      maxLogEntries: 1000,
      sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      ...config,
    };

    this.sessionId = this.generateSessionId();
  }

  /**
   * Generate unique session ID for tracking
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    category?: string,
    context?: Record<string, any>,
    error?: Error,
    userId?: string
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date(),
      category,
      context,
      error,
      userId,
      sessionId: this.sessionId,
    };
  }

  /**
   * Log debug message
   */
  public debug(message: string, context?: Record<string, any>, category?: string): void {
    if (this.shouldLog('debug')) {
      const entry = this.createLogEntry('debug', message, category, context);
      this.processLogEntry(entry);
    }
  }

  /**
   * Log info message
   */
  public info(message: string, context?: Record<string, any>, category?: string): void {
    if (this.shouldLog('info')) {
      const entry = this.createLogEntry('info', message, category, context);
      this.processLogEntry(entry);
    }
  }

  /**
   * Log warning message
   */
  public warn(message: string, context?: Record<string, any>, category?: string): void {
    if (this.shouldLog('warn')) {
      const entry = this.createLogEntry('warn', message, category, context);
      this.processLogEntry(entry);
    }
  }

  /**
   * Log error message
   */
  public error(message: string, error?: Error, context?: Record<string, any>, category?: string): void {
    if (this.shouldLog('error')) {
      const entry = this.createLogEntry('error', message, category, context, error);
      this.processLogEntry(entry);
    }
  }

  /**
   * Log fatal error
   */
  public fatal(message: string, error?: Error, context?: Record<string, any>, category?: string): void {
    if (this.shouldLog('fatal')) {
      const entry = this.createLogEntry('fatal', message, category, context, error);
      this.processLogEntry(entry);
    }
  }

  /**
   * Check if log level should be processed
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Process log entry (console, storage, remote)
   */
  private processLogEntry(entry: LogEntry): void {
    // Add to internal storage
    this.logEntries.push(entry);
    if (this.logEntries.length > this.config.maxLogEntries) {
      this.logEntries = this.logEntries.slice(-this.config.maxLogEntries);
    }

    // Console logging
    if (this.config.enableConsoleLogging) {
      this.logToConsole(entry);
    }

    // Remote logging (sampled)
    if (this.config.enableRemoteLogging && Math.random() <= this.config.sampleRate) {
      this.logToRemote(entry);
    }
  }

  /**
   * Log to console with formatting
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}]`;
    const categoryPrefix = entry.category ? ` [${entry.category}]` : '';
    const message = `${prefix}${categoryPrefix} ${entry.message}`;

    switch (entry.level) {
      case 'debug':
        console.debug(message, entry.context, entry.error);
        break;
      case 'info':
        console.info(message, entry.context, entry.error);
        break;
      case 'warn':
        console.warn(message, entry.context, entry.error);
        break;
      case 'error':
      case 'fatal':
        console.error(message, entry.context, entry.error);
        break;
    }
  }

  /**
   * Log to remote service (placeholder for implementation)
   */
  private async logToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.remoteEndpoint) return;

    try {
      // In production, this would send to a logging service
      // For now, we'll just log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Remote log:', entry);
      }
    } catch (error) {
      console.error('Failed to send log to remote service:', error);
    }
  }

  /**
   * Get recent log entries
   */
  public getRecentEntries(count: number = 50): LogEntry[] {
    return this.logEntries.slice(-count);
  }

  /**
   * Get log entries by level
   */
  public getEntriesByLevel(level: LogLevel): LogEntry[] {
    return this.logEntries.filter(entry => entry.level === level);
  }

  /**
   * Get log entries by category
   */
  public getEntriesByCategory(category: string): LogEntry[] {
    return this.logEntries.filter(entry => entry.category === category);
  }

  /**
   * Clear all log entries
   */
  public clearLogs(): void {
    this.logEntries = [];
  }

  /**
   * Export logs as JSON
   */
  public exportLogs(): string {
    return JSON.stringify(this.logEntries, null, 2);
  }
}

// ============================================================================
// Error Handler Class
// ============================================================================

/**
 * Global error handler with comprehensive error management
 */
export class ErrorHandler {
  private logger: Logger;
  private errorCallbacks: Map<ErrorCategory, (error: AppError) => void> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
    this.setupGlobalHandlers();
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalHandlers(): void {
    if (typeof window !== 'undefined') {
      // Handle unhandled JavaScript errors
      window.addEventListener('error', (event) => {
        this.handleError(
          new AppError(
            event.message,
            'UNHANDLED_ERROR',
            'general',
            'high',
            {
              filename: event.filename,
              lineno: event.lineno,
              colno: event.colno,
            }
          )
        );
      });

      // Handle unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(
          new AppError(
            event.reason?.message || 'Unhandled promise rejection',
            'UNHANDLED_PROMISE',
            'general',
            'high',
            { reason: event.reason }
          )
        );
      });
    }
  }

  /**
   * Handle application error
   */
  public handleError(error: Error | AppError, userId?: string): void {
    const appError = error instanceof AppError 
      ? error 
      : new AppError(error.message, 'UNKNOWN_ERROR', 'general', 'medium');

    // Add user ID if provided
    if (userId && !appError.userId) {
      (appError as any).userId = userId;
    }

    // Log the error
    this.logger.error(
      appError.message,
      appError,
      appError.context,
      appError.category
    );

    // Call category-specific callback if registered
    const callback = this.errorCallbacks.get(appError.category);
    if (callback) {
      try {
        callback(appError);
      } catch (callbackError) {
        this.logger.error('Error in error callback', callbackError as Error);
      }
    }

    // Critical errors might need special handling
    if (appError.severity === 'critical') {
      this.handleCriticalError(appError);
    }
  }

  /**
   * Handle critical errors
   */
  private handleCriticalError(error: AppError): void {
    // In production, this might trigger alerts, rollbacks, etc.
    this.logger.fatal('Critical error occurred', error, error.context, error.category);
  }

  /**
   * Register error callback for specific category
   */
  public registerCallback(category: ErrorCategory, callback: (error: AppError) => void): void {
    this.errorCallbacks.set(category, callback);
  }

  /**
   * Unregister error callback
   */
  public unregisterCallback(category: ErrorCategory): void {
    this.errorCallbacks.delete(category);
  }

  /**
   * Create category-specific error
   */
  public createError(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    category: ErrorCategory = 'general',
    severity: ErrorSeverity = 'medium',
    context?: Record<string, any>
  ): AppError {
    return new AppError(message, code, category, severity, context);
  }

  /**
   * Wrap async function with error handling
   */
  public wrapAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    category: ErrorCategory = 'general',
    userId?: string
  ): T {
    return (async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handleError(error as Error, userId);
        throw error;
      }
    }) as T;
  }

  /**
   * Wrap sync function with error handling
   */
  public wrapSync<T extends (...args: any[]) => any>(
    fn: T,
    category: ErrorCategory = 'general',
    userId?: string
  ): T {
    return ((...args: Parameters<T>) => {
      try {
        return fn(...args);
      } catch (error) {
        this.handleError(error as Error, userId);
        throw error;
      }
    }) as T;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create standardized error with context
 */
export function createError(
  message: string,
  code: string = 'UNKNOWN_ERROR',
  category: ErrorCategory = 'general',
  severity: ErrorSeverity = 'medium',
  context?: Record<string, any>
): AppError {
  return new AppError(message, code, category, severity, context);
}

/**
 * Check if error is network-related
 */
export function isNetworkError(error: Error): boolean {
  return error instanceof AppError 
    ? error.category === 'network' || error.category === 'api'
    : error.message.includes('network') || 
       error.message.includes('fetch') || 
       error.message.includes('timeout');
}

/**
 * Check if error is user-fixable
 */
export function isUserFixableError(error: Error): boolean {
  if (!(error instanceof AppError)) return false;
  
  const userFixableCategories: ErrorCategory[] = [
    'validation',
    'auth',
    'storage',
    'network',
  ];
  
  return userFixableCategories.includes(error.category);
}

/**
 * Get user-friendly error message
 */
export function getUserErrorMessage(error: Error, fallback: string = 'An error occurred'): string {
  if (error instanceof AppError) {
    return error.getUserMessage();
  }
  
  return error.message || fallback;
}

// ============================================================================
// Global Instances
// ============================================================================

/**
 * Global logger instance
 */
export const globalLogger = new Logger();

/**
 * Global error handler instance
 */
export const globalErrorHandler = new ErrorHandler(globalLogger);

// ============================================================================
// React Error Boundary
// ============================================================================

/**
 * React Error Boundary component with enhanced error handling
 */
export class ErrorBoundary extends React.Component<
  { 
    children: React.ReactNode; 
    fallback?: React.ComponentType<{ error: Error; retry: () => void }> 
  },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { 
    children: React.ReactNode; 
    fallback?: React.ComponentType<{ error: Error; retry: () => void }> 
  }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean; error: Error | null } {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    globalErrorHandler.handleError(
      createError(
        `React Error Boundary: ${error.message}`,
        'REACT_ERROR',
        'ui',
        'medium',
        {
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
        }
      )
    );
  }

  retry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return React.createElement(FallbackComponent, { 
        error: this.state.error, 
        retry: this.retry 
      });
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component
 */
function DefaultErrorFallback({ error, retry }: { error: Error; retry: () => void }): React.ReactElement {
  return React.createElement('div', { 
    style: { padding: '20px', textAlign: 'center' } 
  }, [
    React.createElement('h2', { key: 'title' }, 'Something went wrong'),
    React.createElement('p', { key: 'message' }, getUserErrorMessage(error)),
    React.createElement('button', { 
      key: 'button',
      onClick: retry 
    }, 'Try Again')
  ]);
}
