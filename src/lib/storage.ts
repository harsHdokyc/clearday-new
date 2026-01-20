import { supabase } from './supabase';
import { ensureBaseline } from './streaks';

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

    const { error } = await supabase.from('check_ins').upsert(row, {
      onConflict: 'user_id,check_in_date',
    });
    if (error) throw error;
    await ensureBaseline(userId, checkInDate);
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
    const { error } = await supabase.from('check_ins').upsert(
      {
        user_id: userId,
        check_in_date: checkInDate,
        routine_completed: completed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,check_in_date' }
    );
    if (error) throw error;
    await ensureBaseline(userId, checkInDate);
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
      completed: !!data?.routine_completed
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

    return data ? {
      front: data.photo_front_url || undefined,
      right: data.photo_right_url || undefined,
      left: data.photo_left_url || undefined,
    } : null;
  } catch (error) {
    console.error('Error fetching previous day check-in:', error);
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

    return (data || []).map(checkIn => ({
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
  const { error } = await supabase.from('product_evaluations').insert({
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
  const { data, error } = await supabase
    .from('profiles')
    .select('routine_steps')
    .eq('id', userId)
    .maybeSingle();
  
  if (error || !data?.routine_steps) return [];
  const arr = data.routine_steps as unknown;
  return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
};

/** Save user's routine steps to profiles */
export const saveProfileRoutine = async (userId: string, steps: string[]): Promise<void> => {
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
    
  if (existingProfile) {
    await supabase
      .from('profiles')
      .update({ routine_steps: steps, updated_at: new Date().toISOString() })
      .eq('id', userId);
  } else {
    await supabase
      .from('profiles')
      .insert({ 
        id: userId, 
        routine_steps: steps, 
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      });
  }
};
