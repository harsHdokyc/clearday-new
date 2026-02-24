/**
 * Session utility functions for ClearDay authentication
 * Provides helpers to check and manage user session status
 */

// Session duration constants
export const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
export const SESSION_KEY = 'clearday-session-start';
export const LAST_ACTIVITY_KEY = 'clearday-last-activity';

/**
 * Get session information for debugging and user display
 */
export function getSessionInfo() {
  if (typeof window === 'undefined') return null;

  const sessionStart = localStorage.getItem(SESSION_KEY);
  const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);

  if (!sessionStart) {
    return {
      isActive: false,
      message: 'No active session'
    };
  }

  const now = Date.now();
  const sessionAge = now - parseInt(sessionStart);
  const daysSinceLogin = Math.floor(sessionAge / (24 * 60 * 60 * 1000));
  const isExpired = sessionAge >= SESSION_DURATION;
  const daysRemaining = Math.max(0, Math.ceil((SESSION_DURATION - sessionAge) / (24 * 60 * 60 * 1000)));

  return {
    isActive: !isExpired,
    daysSinceLogin,
    daysRemaining,
    sessionStartDate: new Date(parseInt(sessionStart)).toLocaleDateString(),
    lastActivityDate: lastActivity ? new Date(parseInt(lastActivity)).toLocaleDateString() : null,
    message: isExpired 
      ? `Session expired ${daysSinceLogin} days ago` 
      : `Session active - ${daysRemaining} days remaining`
  };
}

/**
 * Check if session is expired
 */
export function isSessionExpired() {
  const info = getSessionInfo();
  return !info?.isActive;
}

/**
 * Get days remaining in session
 */
export function getDaysRemaining() {
  const info = getSessionInfo();
  return info?.daysRemaining || 0;
}

/**
 * Format session duration for display
 */
export function formatSessionDuration(ms: number) {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
  return 'Less than 1 hour';
}
