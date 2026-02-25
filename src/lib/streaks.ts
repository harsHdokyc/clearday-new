/**
 * Streak and dataset continuity logic (Product.md)
 * - Current/longest streak from check_ins
 * - Days missed (consecutive before today)
 * - Reset when 4+ days missed: baseline_date=null, last_reset_at=now()
 */

import { supabase, supabaseAdmin } from './supabase';
import { subDays, differenceInDays, format, parseISO } from 'date-fns';

const CHECK_IN_BUCKET = 'check-in-photos';
const STORAGE_PAGE_SIZE = 1000;
const STORAGE_DELETE_CHUNK_SIZE = 100;

export type StreakData = {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  daysTracked: number;
  daysMissed: number;
  shouldReset: boolean;
  /** True if we already ran applyReset for this gap (avoid duplicate) */
  resetApplied: boolean;
};

function toDate(s: string): Date {
  return typeof s === 'string' && s.includes('T') ? parseISO(s) : new Date(s);
}

async function deleteUserCheckInPhotos(userId: string) {
  try {
    const userPaths = await listAllUserCheckInFiles(userId);
    if (!userPaths.length) {
      return;
    }

    for (let index = 0; index < userPaths.length; index += STORAGE_DELETE_CHUNK_SIZE) {
      const chunk = userPaths.slice(index, index + STORAGE_DELETE_CHUNK_SIZE);
      const { error } = await supabaseAdmin.storage.from(CHECK_IN_BUCKET).remove(chunk);
      if (error) {
        console.error('Error removing check-in photo chunk during reset:', error);
      }
    }
  } catch (error) {
    console.error('Error clearing check-in photos during reset:', error);
  }
}

async function listAllUserCheckInFiles(prefix: string): Promise<string[]> {
  let files: string[] = [];
  let page = 0;

  while (true) {
    const { data, error } = await supabaseAdmin.storage
      .from(CHECK_IN_BUCKET)
      .list(prefix, { limit: STORAGE_PAGE_SIZE, offset: page * STORAGE_PAGE_SIZE });

    if (error) {
      console.error('Error listing storage objects during reset:', error);
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const entry of data) {
      const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.metadata) {
        files.push(fullPath);
      } else {
        const nested = await listAllUserCheckInFiles(fullPath);
        files = files.concat(nested);
      }
    }

    if (data.length < STORAGE_PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return files;
}

/** Get all unique check-in dates for user */
async function getCheckInDates(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('check_ins')
    .select('check_in_date')
    .eq('user_id', userId)
    .order('check_in_date', { ascending: true });
  
  if (error) return [];
  
  const uniqueDates = new Set<string>();
  (data || []).forEach((r: { check_in_date: string }) => {
    const dateStr = String(r.check_in_date).slice(0, 10);
    uniqueDates.add(dateStr);
  });
  
  return Array.from(uniqueDates).sort();
}

/** Compute longest consecutive streak from a sorted list of dates */
function longestConsecutive(dates: string[]): number {
  if (dates.length === 0) return 0;
  let max = 1;
  let cur = 1;
  for (let i = 1; i < dates.length; i++) {
    const a = new Date(dates[i - 1]).getTime();
    const b = new Date(dates[i]).getTime();
    const diff = (b - a) / (24 * 60 * 60 * 1000);
    if (diff === 1) cur += 1;
    else cur = 1;
    if (cur > max) max = cur;
  }
  return max;
}

/** Days from `last` to yesterday (inclusive). last is YYYY-MM-DD. today is Date. */
function consecutiveMissed(last: string, today: Date): number {
  const d = new Date(last);
  const yesterday = subDays(today, 1);
  if (d >= yesterday) return 0;
  return differenceInDays(yesterday, d);
}

export async function getStreakData(userId: string): Promise<StreakData> {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // Get all check-in dates for user
  const dates = await getCheckInDates(userId);
  
  const totalDays = dates.length;
  const hasToday = dates.includes(todayStr);
  const lastDate = dates.length ? dates[dates.length - 1] : null;

  // Calculate days missed (from last check-in to yesterday)
  const daysMissed = lastDate ? consecutiveMissed(lastDate, today) : 0;

  // Get profile for reset tracking
  const { data: profile } = await supabase
    .from('profiles')
    .select('last_reset_at')
    .eq('id', userId)
    .maybeSingle();

  // Reset logic: trigger if 4+ days missed and not already reset for this gap
  const shouldReset = daysMissed >= 4;
  const lastReset = profile?.last_reset_at ? new Date(profile.last_reset_at).getTime() : 0;
  const lastCheckIn = lastDate ? new Date(lastDate).getTime() : 0;
  const resetApplied = shouldReset && lastReset >= lastCheckIn;

  // Calculate current streak (most recent consecutive streak)
  let currentStreak = 0;
  if (dates.length > 0) {
    // Start from the most recent date and count backwards
    let currentDate = new Date(dates[dates.length - 1]);
    currentStreak = 1;
    
    // Count consecutive days going backwards from the most recent check-in
    for (let i = dates.length - 2; i >= 0; i--) {
      const prevDate = new Date(dates[i]);
      const diffDays = differenceInDays(currentDate, prevDate);
      
      if (diffDays === 1) {
        currentStreak++;
        currentDate = prevDate;
      } else {
        break; // Break in streak
      }
    }
  }

  const longestStreak = longestConsecutive(dates);

  const result = {
    currentStreak,
    longestStreak,
    totalDays,
    daysTracked: totalDays,
    daysMissed,
    shouldReset,
    resetApplied,
  };
  
  return result;
}

/** Apply reset: clear all user data when 4+ days missed */
export async function applyReset(userId: string): Promise<void> {
  const timestamp = new Date().toISOString();
  
  // Mark reset in profile
  await supabase
    .from('profiles')
    .update({ last_reset_at: timestamp, updated_at: timestamp })
    .eq('id', userId);

  // Delete all user data using admin client
  await supabaseAdmin.from('check_ins').delete().eq('user_id', userId);
  await supabaseAdmin.from('product_evaluations').delete().eq('user_id', userId);
  
  // Delete stored photos
  await deleteUserCheckInPhotos(userId);
}

