import { supabase } from './supabase';

// Type definitions for database operations
type CheckInRow = {
  id?: string;
  user_id: string;
  check_in_date: string;
  photo_front_url?: string | null;
  photo_right_url?: string | null;
  photo_left_url?: string | null;
  notes?: string | null;
  routine_completed?: boolean;
  ai_insight?: string | null;
  created_at?: string;
  updated_at?: string;
};

type ProfileRow = {
  id: string;
  email?: string;
  name?: string;
  skin_goal?: string | null;
  skin_type?: string | null;
  routine_steps?: string[];
  baseline_date?: string | null;
  last_reset_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

type ProductEvaluationRow = {
  id?: string;
  user_id: string;
  product_name: string;
  fit_score: number;
  verdict: string;
  insight_message?: string | null;
  created_at?: string;
  updated_at?: string;
};

type NotificationRow = {
  id?: string;
  user_id: string;
  title: string;
  message: string;
  type: 'reminder' | 'achievement' | 'progress' | 'system';
  read: boolean;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
};

const BUCKET_NAME = 'check-in-photos';

/**
 * Upload photo to Supabase Storage
 */
export const uploadPhoto = async (
  file: File,
  userId: string,
  viewType: 'front' | 'right' | 'left',
  date: string = new Date().toISOString().split('T')[0]
): Promise<string> => {
  try {
    // Ensure bucket exists (this will be created manually in Supabase dashboard)
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${date}/${viewType}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload file
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw new Error('Failed to upload photo');
  }
};

/**
 * Save check-in (photos, notes) to database. Preserves routine_completed when not provided.
 */
export const saveCheckIn = async (
  userId: string,
  photos: { front?: string; right?: string; left?: string },
  opts?: { notes?: string; routineCompleted?: boolean }
): Promise<void> => {
  try {
    const checkInDate = new Date().toISOString().split('T')[0];
    const existing = await getTodayCheckIn(userId);

    const row = {
      user_id: userId,
      check_in_date: checkInDate,
      photo_front_url: photos.front ?? existing?.photo_front_url ?? null,
      photo_right_url: photos.right ?? existing?.photo_right_url ?? null,
      photo_left_url: photos.left ?? existing?.photo_left_url ?? null,
      notes: opts?.notes ?? existing?.notes ?? null,
      routine_completed: opts?.routineCompleted ?? existing?.routine_completed ?? false,
      updated_at: new Date().toISOString(),
    };

    const supabaseAny = supabase as any;
    const { error } = await supabaseAny
      .from('check_ins')
      .upsert(row, {
        onConflict: 'user_id,check_in_date',
      });
    if (error) throw error;
  } catch (error) {
    console.error('Error saving check-in:', error);
    throw new Error('Failed to save check-in');
  }
};

/**
 * Update or set routine_completed for today. Creates a row if none.
 */
export const updateCheckInRoutine = async (userId: string, completed: boolean): Promise<void> => {
  try {
    const checkInDate = new Date().toISOString().split('T')[0];
    const supabaseAny = supabase as any;
    const { error } = await supabaseAny
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
    if (error) throw error;
  } catch (error) {
    console.error('Error updating routine:', error);
    throw new Error('Failed to update routine');
  }
};

/**
 * Get today's routine completion status
 */
export const getTodayRoutineCompletion = async (userId: string) => {
  try {
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
      completed: !!(data as any && (data as any).routine_completed)
    };
  } catch (error) {
    console.error('Error fetching routine completion:', error);
    return { completed: false };
  }
};

/**
 * Get previous day's check-in for comparison
 */
export const getPreviousDayCheckIn = async (userId: string) => {
  try {
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

    return (data as any) ? {
      front: (data as any).photo_front_url || undefined,
      right: (data as any).photo_right_url || undefined,
      left: (data as any).photo_left_url || undefined,
    } : null;
  } catch (error) {
    console.error('Error fetching previous day check-in:', error);
    return null;
  }
};

/**
 * Get photos from the past 3 days for comparison
 * Returns the most recent day with photos within the last 3 days
 * Optimized to use single query instead of multiple queries in loop
 */
export const getRecentDayPhotos = async (userId: string): Promise<{ front?: string; right?: string; left?: string } | null> => {
  try {
    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];
    
    // Single query to get all check-ins from past 3 days
    const { data, error } = await supabase
      .from('check_ins')
      .select('check_in_date, photo_front_url, photo_right_url, photo_left_url')
      .eq('user_id', userId)
      .gte('check_in_date', threeDaysAgoStr)
      .order('check_in_date', { ascending: false })
      .limit(3);

    if (error) {
      console.error('Error fetching recent check-ins:', error);
      return null;
    }

    // Find the most recent day with photos (excluding today)
    const todayStr = today.toISOString().split('T')[0];
    const recentWithPhotos = (data as any || []).find((checkIn: any) => 
      checkIn.check_in_date !== todayStr && 
      (checkIn.photo_front_url || checkIn.photo_right_url || checkIn.photo_left_url)
    );

    if (!recentWithPhotos) {
      return null;
    }

    return {
      front: recentWithPhotos.photo_front_url || undefined,
      right: recentWithPhotos.photo_right_url || undefined,
      left: recentWithPhotos.photo_left_url || undefined,
    };
  } catch (error) {
    console.error('Error fetching recent day photos:', error);
    return null;
  }
};

/**
 * Get progress history for visualization
 */
export const getProgressHistory = async (userId: string): Promise<Array<{ date: string; hasData: boolean; value?: number }>> => {
  try {
    const { data, error } = await supabase
      .from('check_ins')
      .select('check_in_date, photo_front_url, photo_right_url, photo_left_url')
      .eq('user_id', userId)
      .order('check_in_date', { ascending: true })
      .limit(14);

    if (error) {
      console.error('Error fetching progress history:', error);
      return [];
    }

    return ((data as any) || []).map((checkIn: any) => ({
      date: checkIn.check_in_date,
      hasData: !!(checkIn.photo_front_url || checkIn.photo_right_url || checkIn.photo_left_url),
      value: checkIn.photo_front_url ? 50 + Math.random() * 30 : undefined // Placeholder value based on photo availability
    }));
  } catch (error) {
    console.error('Error fetching progress history:', error);
    return [];
  }
};

/**
 * Get today's check-in
 */
export const getTodayCheckIn = async (userId: string) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Use maybeSingle() instead of single() to handle empty results gracefully
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
    console.error('Error fetching check-in:', error);
    return null;
  }
};

/**
 * Get all check-ins for a user
 */
export const getUserCheckIns = async (userId: string, limit: number = 30) => {
  try {
    const { data, error } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', userId)
      .order('check_in_date', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching check-ins:', error);
    return [];
  }
};

/** Save product evaluation (Product.md) */
export const saveProductEvaluation = async (
  userId: string,
  p: { productName: string; fitScore: number; verdict: string; insightMessage?: string }
): Promise<void> => {
  const supabaseAny = supabase as any;
  const { error } = await supabaseAny.from('product_evaluations').insert({
    user_id: userId,
    product_name: p.productName,
    fit_score: p.fitScore,
    verdict: p.verdict,
    insight_message: p.insightMessage ?? null,
  });
  if (error) throw error;
};

/** Get recent product evaluations for a user */
export const getUserProductEvaluations = async (userId: string, limit = 10) => {
  const { data, error } = await supabase
    .from('product_evaluations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
};

/** Get user's saved routine steps (from profiles) */
export const getProfileRoutine = async (userId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('routine_steps')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) return [];
    
    // Type assertion to handle routine_steps safely
    const profile = data as any;
    if (!profile?.routine_steps) return [];
    
    const routineSteps = profile.routine_steps;
    if (!Array.isArray(routineSteps)) return [];
    
    return routineSteps.filter((x: unknown): x is string => typeof x === 'string');
  } catch (error) {
    console.error('Error fetching profile routine:', error);
    return [];
  }
};

/** Save user's routine steps to profiles */
export const saveProfileRoutine = async (userId: string, steps: string[]): Promise<void> => {
  try {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
      
    if (existingProfile) {
      // Update existing profile using dynamic approach
      const supabaseAny = supabase as any;
      const { error } = await supabaseAny
        .from('profiles')
        .update({ 
          routine_steps: steps, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', userId);
      
      if (error) throw error;
    } else {
      // Insert new profile using dynamic approach
      const supabaseAny = supabase as any;
      const { error } = await supabaseAny
        .from('profiles')
        .insert({ 
          id: userId, 
          routine_steps: steps, 
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
      
      if (error) throw error;
    }
  } catch (error) {
    console.error('Error saving profile routine:', error);
    throw new Error('Failed to save routine');
  }
};

// Notification functions
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'reminder' | 'achievement' | 'progress' | 'system';
  read: boolean;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: 'reminder' | 'achievement' | 'progress' | 'system',
  metadata?: Record<string, any>
): Promise<Notification> => {
  const supabaseAny = supabase as any;
  const { data, error } = await supabaseAny
    .from('notifications')
    .insert({
      user_id: userId,
      title,
      message,
      type,
      metadata: metadata || {}
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getNotifications = async (userId: string): Promise<Notification[]> => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  const supabaseAny = supabase as any;
  const { error } = await supabaseAny
    .from('notifications')
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) throw error;
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  const supabaseAny = supabase as any;
  const { error } = await supabaseAny
    .from('notifications')
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) throw error;
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) throw error;
};

export const clearAllNotifications = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
};

// Helper functions to create specific notification types
export const createStreakMilestoneNotification = async (
  userId: string,
  streak: number
): Promise<void> => {
  await createNotification(
    userId,
    "Streak Milestone",
    `You're on a ${streak}-day streak! Keep it up!`,
    'achievement',
    { streak }
  );
};

export const createProgressNotification = async (
  userId: string,
  metric: string,
  improvement: number
): Promise<void> => {
  await createNotification(
    userId,
    "Progress Update",
    `Your ${metric.toLowerCase()} has improved by ${improvement}%`,
    'progress',
    { metric, improvement }
  );
};

export const createDailyReminderNotification = async (
  userId: string
): Promise<void> => {
  await createNotification(
    userId,
    "Daily Reminder",
    "Time for your evening skincare routine!",
    'reminder'
  );
};

