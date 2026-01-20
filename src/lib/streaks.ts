/**
 * Streak and dataset continuity logic (Product.md)
 * - Current/longest streak from check_ins
 * - Days missed (consecutive before today)
 * - Reset when 4+ days missed: baseline_date=null, last_reset_at=now()
 */

import { supabase } from './supabase';
import { subDays, differenceInDays, format, parseISO } from 'date-fns';

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

/** Get sorted unique check-in dates (YYYY-MM-DD) for user, optionally after baseline */
async function getCheckInDates(userId: string, afterBaseline: string | null): Promise<string[]> {
  let q = supabase
    .from('check_ins')
    .select('check_in_date')
    .eq('user_id', userId)
    .order('check_in_date', { ascending: true });
  if (afterBaseline) q = q.gte('check_in_date', afterBaseline);
  const { data, error } = await q;
  if (error) return [];
  const set = new Set<string>();
  (data || []).forEach((r: { check_in_date: string }) => set.add(String(r.check_in_date).slice(0, 10)));
  return Array.from(set).sort();
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

  // 1) Profile: baseline_date, last_reset_at
  const { data: profile } = await supabase
    .from('profiles')
    .select('baseline_date, last_reset_at')
    .eq('id', userId)
    .maybeSingle();
  let baseline: string | null = profile?.baseline_date ? String(profile.baseline_date).slice(0, 10) : null;

  // 2) All check-in dates (respecting baseline if set)
  const dates = await getCheckInDates(userId, baseline);

  const totalDays = dates.length;
  const hasToday = dates.includes(todayStr);
  const lastDate = dates.length ? dates[dates.length - 1]! : null;

  // 3) Days missed (from last check-in to yesterday)
  const daysMissed = lastDate ? consecutiveMissed(lastDate, today) : 0;

  // 4) Should reset? (4+ missed). alreadyApplied = we've run applyReset for this gap
  const shouldReset = daysMissed >= 4;
  const lastReset = profile?.last_reset_at ? new Date(String(profile.last_reset_at)).getTime() : 0;
  const lastCheckIn = lastDate ? new Date(lastDate).getTime() : 0;
  const resetApplied = shouldReset && lastReset >= lastCheckIn;

  // 5) Current streak: from today backwards, count consecutive days with check-in
  let currentStreak = 0;
  if (hasToday) {
    currentStreak = 1;
    let d = subDays(today, 1);
    while (d.getTime() >= (dates[0] ? new Date(dates[0]).getTime() : 0)) {
      const s = format(d, 'yyyy-MM-dd');
      if (dates.includes(s)) {
        currentStreak++;
        d = subDays(d, 1);
      } else break;
    }
  }

  // 6) Longest streak (within current baseline window)
  const longestStreak = longestConsecutive(dates);

  return {
    currentStreak,
    longestStreak,
    totalDays,
    daysTracked: totalDays,
    daysMissed,
    shouldReset,
    resetApplied,
  };
}

/** Apply reset (4+ days missed): set baseline_date=null, last_reset_at=now() */
export async function applyReset(userId: string): Promise<void> {
  await supabase
    .from('profiles')
    .update({ baseline_date: null, last_reset_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', userId);
}

/** Set baseline to today when it's null (first check-in after reset or ever) */
export async function ensureBaseline(userId: string, checkInDate: string): Promise<void> {
  const { data } = await supabase.from('profiles').select('baseline_date').eq('id', userId).maybeSingle();
  if (data?.baseline_date == null) {
    await supabase
      .from('profiles')
      .update({ baseline_date: checkInDate, updated_at: new Date().toISOString() })
      .eq('id', userId);
  }
}
