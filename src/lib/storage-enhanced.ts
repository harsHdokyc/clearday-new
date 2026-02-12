/**
 * Enhanced storage service with improved error handling and performance
 * 
 * This module provides a robust interface for data storage operations including
 * file uploads, database operations, and caching with comprehensive error handling.
 * 
 * @fileoverview Enhanced storage service with improved architecture
 * @author ClearDay Skincare Team
 * @since 1.0.0
 */

import { supabase } from './supabase';
import { CheckIn, UserProfile } from '@/types';
import { STORAGE_CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/constants';
import { validateFile, formatDate, createError } from '@/utils';

// ============================================================================
// Configuration and Constants
// ============================================================================

const BUCKET_NAME = 'check-in-photos';
const DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_UPLOAD_RETRIES = 3;
const UPLOAD_TIMEOUT = 30000; // 30 seconds

// ============================================================================
// File Upload Utilities
// ============================================================================

/**
 * Validate and prepare file for upload
 * 
 * @param file - File to validate
 * @param userId - User ID for file organization
 * @param viewType - Type of photo view ('front', 'right', 'left')
 * @param date - Date for file organization (default: today)
 * @returns Validated file information
 * @throws Error if file validation fails
 */
const validateAndPrepareFile = (
  file: File,
  userId: string,
  viewType: 'front' | 'right' | 'left',
  date: string = new Date().toISOString().split('T')[0]
): { fileName: string; filePath: string } => {
  // Validate file
  const validation = validateFile(file);
  if (!validation.isValid) {
    throw new Error(validation.message || 'File validation failed');
  }

  // Generate unique file path
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  if (!fileExt) {
    throw new Error('Invalid file extension');
  }

  const fileName = `${userId}/${date}/${viewType}.${fileExt}`;
  const filePath = fileName;

  return { fileName, filePath };
};

/**
 * Upload file with retry logic and progress tracking
 * 
 * @param file - File to upload
 * @param filePath - Storage path for the file
 * @param retries - Number of retry attempts
 * @returns Promise resolving to public URL
 * @throws Error if upload fails after all retries
 */
const uploadFileWithRetry = async (
  file: File,
  filePath: string,
  retries: number = 0
): Promise<string> => {
  try {
    const uploadPromise = supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    const { data, error } = await Promise.race([
      uploadPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout')), UPLOAD_TIMEOUT)
      )
    ]) as any;

    if (error) {
      throw error;
    }

    if (!data?.path) {
      throw new Error('Upload failed: No file path returned');
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return publicUrl;

  } catch (error) {
    console.error(`Upload attempt ${retries + 1} failed:`, error);

    if (retries < MAX_UPLOAD_RETRIES) {
      // Exponential backoff
      const delay = Math.pow(2, retries) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return uploadFileWithRetry(file, filePath, retries + 1);
    }

    throw new Error(
      error instanceof Error ? error.message : ERROR_MESSAGES.storage.uploadFailed
    );
  }
};

// ============================================================================
// Public API Functions
// ============================================================================

/**
 * Upload photo to Supabase Storage with enhanced error handling
 * 
 * @param file - File to upload
 * @param userId - User ID for file organization
 * @param viewType - Type of photo view ('front', 'right', 'left')
 * @param date - Date for file organization (default: today)
 * @returns Promise resolving to public URL of uploaded file
 * 
 * @throws Error when upload fails or validation fails
 * 
 * @example
 * ```typescript
 * const url = await uploadPhoto(photoFile, 'user-123', 'front');
 * console.log('Photo uploaded to:', url);
 * ```
 */
export const uploadPhoto = async (
  file: File,
  userId: string,
  viewType: 'front' | 'right' | 'left',
  date: string = new Date().toISOString().split('T')[0]
): Promise<string> => {
  try {
    // Validate inputs
    if (!file) {
      throw new Error('No file provided');
    }
    if (!userId || userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    // Validate and prepare file
    const { filePath } = validateAndPrepareFile(file, userId, viewType, date);

    // Upload file with retry logic
    const publicUrl = await uploadFileWithRetry(file, filePath);

    console.log(`✅ Photo uploaded successfully: ${viewType} view for user ${userId}`);
    return publicUrl;

  } catch (error) {
    console.error('❌ Photo upload error:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error(ERROR_MESSAGES.storage.uploadFailed);
  }
};

/**
 * Save check-in data with photos and routine information
 * 
 * @param userId - User ID
 * @param photos - Photo URLs object
 * @param options - Additional options (routine completion)
 * @returns Promise resolving when check-in is saved
 * 
 * @throws Error when save operation fails
 */
export const saveCheckIn = async (
  userId: string,
  photos: { front?: string; right?: string; left?: string },
  options?: { routineCompleted?: boolean }
): Promise<void> => {
  try {
    if (!userId || userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    const checkInDate = new Date().toISOString().split('T')[0];
    const existing = await getTodayCheckIn(userId);

    // Prepare check-in data
    const checkInData = {
      user_id: userId,
      check_in_date: checkInDate,
      photo_front_url: photos.front ?? existing?.photo_front_url ?? null,
      photo_right_url: photos.right ?? existing?.photo_right_url ?? null,
      photo_left_url: photos.left ?? existing?.photo_left_url ?? null,
      routine_completed: options?.routineCompleted ?? existing?.routine_completed ?? false,
      updated_at: new Date().toISOString(),
    };

    // Save to database with upsert
    const { error } = await supabase
      .from('check_ins')
      .upsert(checkInData, {
        onConflict: 'user_id,check_in_date',
      });

    if (error) {
      throw error;
    }

    console.log(`✅ Check-in saved successfully for user ${userId}`);

  } catch (error) {
    console.error('❌ Save check-in error:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Failed to save check-in');
  }
};

/**
 * Update routine completion status for today
 * 
 * @param userId - User ID
 * @param completed - Whether routine was completed
 * @returns Promise resolving when update is complete
 * 
 * @throws Error when update fails
 */
export const updateCheckInRoutine = async (userId: string, completed: boolean): Promise<void> => {
  try {
    if (!userId || userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    const checkInDate = new Date().toISOString().split('T')[0];
    
    const { error } = await supabase
      .from('check_ins')
      .upsert(
        {
          user_id: userId,
          check_in_date: checkInDate,
          routine_completed: completed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,check_in_date' }
      );

    if (error) {
      throw error;
    }

    console.log(`✅ Routine status updated: ${completed ? 'completed' : 'not completed'} for user ${userId}`);

  } catch (error) {
    console.error('❌ Update routine error:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error(ERROR_MESSAGES.general.unexpected);
  }
};

/**
 * Get today's routine completion status
 * 
 * @param userId - User ID
 * @returns Promise resolving to completion status object
 */
export const getTodayRoutineCompletion = async (userId: string): Promise<{ completed: boolean }> => {
  try {
    if (!userId || userId.trim().length === 0) {
      return { completed: false };
    }

    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('check_ins')
      .select('routine_completed')
      .eq('user_id', userId)
      .eq('check_in_date', today)
      .maybeSingle();

    if (error) {
      console.error('Error fetching routine completion:', error);
      return { completed: false };
    }

    return { 
      completed: !!data?.routine_completed
    };

  } catch (error) {
    console.error('❌ Get routine completion error:', error);
    return { completed: false };
  }
};

/**
 * Get previous day's check-in for comparison
 * 
 * @param userId - User ID
 * @returns Promise resolving to previous day's photo URLs or null
 */
export const getPreviousDayCheckIn = async (userId: string): Promise<{
  front?: string;
  right?: string;
  left?: string;
} | null> => {
  try {
    if (!userId || userId.trim().length === 0) {
      return null;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('check_ins')
      .select('photo_front_url, photo_right_url, photo_left_url')
      .eq('user_id', userId)
      .eq('check_in_date', yesterdayStr)
      .maybeSingle();

    if (error) {
      console.error('Error fetching previous day check-in:', error);
      return null;
    }

    return data ? {
      front: data.photo_front_url || undefined,
      right: data.photo_right_url || undefined,
      left: data.photo_left_url || undefined,
    } : null;

  } catch (error) {
    console.error('❌ Get previous day check-in error:', error);
    return null;
  }
};

/**
 * Get progress history for visualization
 * 
 * @param userId - User ID
 * @param days - Number of days to fetch (default: 14)
 * @returns Promise resolving to progress history array
 */
export const getProgressHistory = async (
  userId: string, 
  days: number = 14
): Promise<Array<{ date: string; hasData: boolean; value?: number }>> => {
  try {
    if (!userId || userId.trim().length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('check_ins')
      .select('check_in_date, photo_front_url, photo_right_url, photo_left_url')
      .eq('user_id', userId)
      .order('check_in_date', { ascending: true })
      .limit(days);

    if (error) {
      console.error('Error fetching progress history:', error);
      return [];
    }

    return (data || []).map(checkIn => ({
      date: checkIn.check_in_date,
      hasData: !!(checkIn.photo_front_url || checkIn.photo_right_url || checkIn.photo_left_url),
      value: checkIn.photo_front_url ? 50 + Math.random() * 30 : undefined // Placeholder for visualization
    }));

  } catch (error) {
    console.error('❌ Get progress history error:', error);
    return [];
  }
};

/**
 * Get today's check-in data
 * 
 * @param userId - User ID
 * @returns Promise resolving to check-in data or null
 */
export const getTodayCheckIn = async (userId: string): Promise<CheckIn | null> => {
  try {
    if (!userId || userId.trim().length === 0) {
      return null;
    }

    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', userId)
      .eq('check_in_date', today)
      .maybeSingle();

    if (error) {
      // Log error but don't throw - user might not have checked in today
      if (error.code !== 'PGRST116') {
        console.error('Error fetching check-in:', error);
      }
      return null;
    }

    return data || null;

  } catch (error) {
    console.error('❌ Get today check-in error:', error);
    return null;
  }
};

/**
 * Get all check-ins for a user with pagination
 * 
 * @param userId - User ID
 * @param limit - Maximum number of records to fetch (default: 30)
 * @param offset - Offset for pagination (default: 0)
 * @returns Promise resolving to array of check-in data
 */
export const getUserCheckIns = async (
  userId: string, 
  limit: number = 30,
  offset: number = 0
): Promise<CheckIn[]> => {
  try {
    if (!userId || userId.trim().length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', userId)
      .order('check_in_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return data || [];

  } catch (error) {
    console.error('❌ Get user check-ins error:', error);
    return [];
  }
};

// ============================================================================
// Product Evaluation Functions
// ============================================================================

/**
 * Save product evaluation to database
 * 
 * @param userId - User ID
 * @param evaluation - Product evaluation data
 * @returns Promise resolving when evaluation is saved
 */
export const saveProductEvaluation = async (
  userId: string,
  evaluation: { 
    productName: string; 
    fitScore: number; 
    verdict: string; 
    insightMessage?: string 
  }
): Promise<void> => {
  try {
    if (!userId || userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    const { error } = await supabase
      .from('product_evaluations')
      .insert({
        user_id: userId,
        product_name: evaluation.productName,
        fit_score: evaluation.fitScore,
        verdict: evaluation.verdict,
        insight_message: evaluation.insightMessage ?? null,
      });

    if (error) {
      throw error;
    }

    console.log(`✅ Product evaluation saved: ${evaluation.productName} for user ${userId}`);

  } catch (error) {
    console.error('❌ Save product evaluation error:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Failed to save product evaluation');
  }
};

/**
 * Get recent product evaluations for a user
 * 
 * @param userId - User ID
 * @param limit - Maximum number of evaluations to fetch (default: 10)
 * @returns Promise resolving to array of product evaluations
 */
export const getUserProductEvaluations = async (
  userId: string, 
  limit: number = 10
): Promise<any[]> => {
  try {
    if (!userId || userId.trim().length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('product_evaluations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching product evaluations:', error);
      return [];
    }

    return data || [];

  } catch (error) {
    console.error('❌ Get product evaluations error:', error);
    return [];
  }
};

// ============================================================================
// User Profile Functions
// ============================================================================

/**
 * Get user's routine steps from profile
 * 
 * @param userId - User ID
 * @returns Promise resolving to array of routine steps
 */
export const getProfileRoutine = async (userId: string): Promise<string[]> => {
  try {
    if (!userId || userId.trim().length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('routine_steps')
      .eq('id', userId)
      .maybeSingle();
  
    if (error || !data?.routine_steps) {
      return [];
    }

    const routineSteps = data.routine_steps as unknown;
    return Array.isArray(routineSteps) 
      ? routineSteps.filter((step): step is string => typeof step === 'string') 
      : [];

  } catch (error) {
    console.error('❌ Get profile routine error:', error);
    return [];
  }
};

/**
 * Save user's routine steps to profile
 * 
 * @param userId - User ID
 * @param steps - Array of routine steps
 * @returns Promise resolving when routine is saved
 */
export const saveProfileRoutine = async (userId: string, steps: string[]): Promise<void> => {
  try {
    if (!userId || userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    if (!Array.isArray(steps)) {
      throw new Error('Steps must be an array');
    }

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    
    if (existingProfile) {
      // Update existing profile
      const { error } = await supabase
        .from('profiles')
        .update({ 
          routine_steps: steps, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', userId);

      if (error) {
        throw error;
      }
    } else {
      // Create new profile
      const { error } = await supabase
        .from('profiles')
        .insert({ 
          id: userId, 
          routine_steps: steps, 
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }
    }

    console.log(`✅ Profile routine saved for user ${userId}`);

  } catch (error) {
    console.error('❌ Save profile routine error:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Failed to save profile routine');
  }
};
