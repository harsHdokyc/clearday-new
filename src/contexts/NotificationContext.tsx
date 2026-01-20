import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface NotificationSettings {
  enabled: boolean;
  time: string; // HH:MM format
  lastNotified: string | null; // ISO date string
}

interface NotificationContextType {
  settings: NotificationSettings;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  requestPermission: () => Promise<boolean>;
  scheduleReminder: () => void;
  cancelReminder: () => void;
  permission: NotificationPermission;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = 'dailyReminderSettings';

const defaultSettings: NotificationSettings = {
  enabled: false,
  time: '09:00', // Default 9 AM
  lastNotified: null,
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  let reminderTimeout: NodeJS.Timeout | null = null;

  useEffect(() => {
    // Check notification permission on mount
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Load settings from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsedSettings = JSON.parse(saved);
      setSettings({ ...defaultSettings, ...parsedSettings });
    }
  }, []);

  useEffect(() => {
    // Save settings to localStorage whenever they change
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

    // Reschedule reminder when settings change
    if (settings.enabled) {
      scheduleReminder();
    } else {
      cancelReminder();
    }
  }, [settings]);

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      setPermission('granted');
      return true;
    }

    if (Notification.permission !== 'denied') {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    }

    return false;
  };

  const showNotification = useCallback(() => {
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    const notification = new Notification('ClearDay Reminder', {
      body: 'Time for your daily skin check-in! Track your progress and maintain your routine.',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'daily-reminder',
      requireInteraction: false,
      silent: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      // Navigate to dashboard
      window.location.href = '/dashboard';
    };

    // Update last notified time
    const now = new Date().toISOString();
    updateSettings({ lastNotified: now });

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
  }, [permission]);

  const scheduleReminder = useCallback(() => {
    // Cancel any existing reminder
    if (reminderTimeout) {
      clearTimeout(reminderTimeout);
    }

    if (!settings.enabled) {
      return;
    }

    const now = new Date();
    const [hours, minutes] = settings.time.split(':').map(Number);
    
    // Create today's reminder time
    const reminderTime = new Date();
    reminderTime.setHours(hours, minutes, 0, 0);

    // If today's reminder time has passed, schedule for tomorrow
    if (reminderTime <= now) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    // Check if we already notified today
    const today = now.toDateString();
    const lastNotifiedDate = settings.lastNotified ? new Date(settings.lastNotified).toDateString() : null;
    
    if (lastNotifiedDate === today) {
      // Already notified today, schedule for tomorrow
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    const timeUntilReminder = reminderTime.getTime() - now.getTime();

    // Schedule the reminder
    reminderTimeout = setTimeout(() => {
      showNotification();
      // Schedule next day's reminder
      scheduleReminder();
    }, timeUntilReminder);

    console.log(`Reminder scheduled for: ${reminderTime.toLocaleString()}`);
  }, [settings.enabled, settings.time, settings.lastNotified, showNotification]);

  const cancelReminder = useCallback(() => {
    if (reminderTimeout) {
      clearTimeout(reminderTimeout);
      reminderTimeout = null;
      console.log('Reminder cancelled');
    }
  }, []);

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const value: NotificationContextType = {
    settings,
    updateSettings,
    requestPermission,
    scheduleReminder,
    cancelReminder,
    permission,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
