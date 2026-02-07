import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { StreakSection } from "@/components/dashboard/StreakSection";
import { CheckInCard } from "@/components/dashboard/CheckInCard";
import { ProgressCard } from "@/components/dashboard/ProgressCard";
import { InsightCard } from "@/components/ui/insight-card";
import { StreakWarning } from "@/components/dashboard/StreakWarning";
import { NotificationDropdown } from "@/components/ui/NotificationDropdown";
import { User, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { uploadPhoto, saveCheckIn, getTodayCheckIn, updateCheckInRoutine, getProfileRoutine, saveProfileRoutine, getTodayRoutineCompletion, getPreviousDayCheckIn, getProgressHistory, getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, clearAllNotifications, createStreakMilestoneNotification, createProgressNotification, Notification } from "@/lib/storage";
import { getStreakData, applyReset } from "@/lib/streaks";
import { analyzeSkinProgress } from "@/lib/ai";
import { useToast } from "@/hooks/use-toast";
import heroImage from "@/assets/hero-skincare.jpg";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [existingPhotos, setExistingPhotos] = useState<{ front?: string; right?: string; left?: string }>({});
  const [savedRoutineSteps, setSavedRoutineSteps] = useState<string[]>([]);
  const [routineCompleted, setRoutineCompleted] = useState(false);
  const [todayRoutineCompleted, setTodayRoutineCompleted] = useState(false);

  const [userData, setUserData] = useState({
    currentStreak: 0,
    longestStreak: 0,
    totalDays: 0,
    daysTracked: 0,
    daysMissed: 0,
  });

  const [metrics, setMetrics] = useState<{ label: string; value: number; trend: "up" | "down" | "neutral"; isGood: boolean }[]>([
    { label: "Acne Reduction", value: 0, trend: "neutral" as const, isGood: true },
    { label: "Redness", value: 0, trend: "neutral" as const, isGood: true },
    { label: "Skin Clarity", value: 0, trend: "neutral" as const, isGood: true },
  ]);

  const [insightMessage, setInsightMessage] = useState<string | null>(
    "Consistency is key. Keep tracking to see your progress."
  );

  const [progressHistory, setProgressHistory] = useState<Array<{ date: string; hasData: boolean; value?: number }>>([]);

  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  // Load notifications from database
  const loadNotifications = async () => {
    if (!user?.id) return;
    try {
      const userNotifications = await getNotifications(user.id);
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  // Analyze skin progress when photos are available
  const analyzeProgress = async () => {
    if (!user?.id || !existingPhotos.front && !existingPhotos.right && !existingPhotos.left) return;

    try {
      const previousDayPhotos = await getPreviousDayCheckIn(user.id);
      const analysis = await analyzeSkinProgress(existingPhotos, previousDayPhotos);
      
      setMetrics(analysis.metrics);
      setInsightMessage(analysis.insight);
    } catch (error) {
      console.error('Progress analysis error:', error);
      // Keep existing metrics if analysis fails
    }
  };

  // Check-in, streak, and routine
  useEffect(() => {
    if (!user?.id) return;
    const run = async () => {
      const [checkIn, streak, routine, todayCompletion, history] = await Promise.all([
        getTodayCheckIn(user.id),
        getStreakData(user.id),
        getProfileRoutine(user.id),
        getTodayRoutineCompletion(user.id),
        getProgressHistory(user.id),
      ]);
      
      if (checkIn) {
        setHasCheckedInToday(true);
        setExistingPhotos({
          front: (checkIn as { photo_front_url?: string }).photo_front_url || undefined,
          right: (checkIn as { photo_right_url?: string }).photo_right_url || undefined,
          left: (checkIn as { photo_left_url?: string }).photo_left_url || undefined,
        });
        setRoutineCompleted(!!(checkIn as { routine_completed?: boolean }).routine_completed);
      }
      setTodayRoutineCompleted(todayCompletion.completed);
      setProgressHistory(history);
      setUserData({
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        totalDays: streak.totalDays,
        daysTracked: streak.daysTracked,
        daysMissed: streak.daysMissed,
      });
      setSavedRoutineSteps(routine);
      if (streak.shouldReset && !streak.resetApplied) {
        await applyReset(user.id);
      }
      
      // Load notifications
      await loadNotifications();
    };
    run();
  }, [user?.id]);

  // Analyze progress when photos are updated
  useEffect(() => {
    if (existingPhotos.front || existingPhotos.right || existingPhotos.left) {
      analyzeProgress();
      
      // Update progress history to include today
      const today = new Date().toISOString().split('T')[0];
      setProgressHistory(prev => {
        const filtered = prev.filter(day => day.date !== today);
        return [...filtered, {
          date: today,
          hasData: true,
          value: 65 // Placeholder value based on current analysis
        }];
      });
      
      // Check for progress improvements and create notifications
      metrics.forEach(async (metric) => {
        if (metric.trend === 'up' && metric.value > 5) { // Only notify for meaningful improvements
          try {
            await createProgressNotification(user.id, metric.label, metric.value);
            await loadNotifications(); // Reload notifications to show the new one
          } catch (error) {
            console.error('Error creating progress notification:', error);
          }
        }
      });
    }
  }, [existingPhotos]);

  // AI insight (best-effort, non-blocking)
  useEffect(() => {
    if (!user?.id || userData.daysTracked < 2) return;
    import("@/lib/ai").then(({ generateProgressInsight }) => {
      const metricsForInsight = metrics.map(m => ({
        label: m.label,
        value: m.value,
        trend: m.trend as 'up' | 'down'
      }));
      generateProgressInsight(metricsForInsight, userData.daysTracked)
        .then(setInsightMessage)
        .catch(() => {});
    });
  }, [user?.id, userData.daysTracked, metrics]);

  const loadStreak = async () => {
    if (!user?.id) return;
    const s = await getStreakData(user.id);
    setUserData({
      currentStreak: s.currentStreak,
      longestStreak: s.longestStreak,
      totalDays: s.totalDays,
      daysTracked: s.daysTracked,
      daysMissed: s.daysMissed,
    });
  };

  const checkAndUpdateStreak = async () => {
    // Only update streak if both required photos (front and right) exist AND routine is completed
    const hasRequiredPhotos = existingPhotos.front && existingPhotos.right;
    if (hasRequiredPhotos && routineCompleted) {
      await loadStreak();
      
      // Check for streak milestones and create notifications
      const newStreak = userData.currentStreak;
      if (newStreak > 0 && (newStreak % 3 === 0 || newStreak % 7 === 0 || newStreak % 30 === 0)) {
        try {
          await createStreakMilestoneNotification(user.id, newStreak);
          await loadNotifications(); // Reload notifications to show the new one
        } catch (error) {
          console.error('Error creating streak notification:', error);
        }
      }
    }
  };

  const handlePhotoUpload = async (photos: { front?: File; right?: File; left?: File }) => {
    if (!user?.id) {
      toast({ title: "Error", description: "Please log in to upload photos", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const photoUrls: { front?: string; right?: string; left?: string } = {};
      if (photos.front) photoUrls.front = await uploadPhoto(photos.front, user.id, "front");
      if (photos.right) photoUrls.right = await uploadPhoto(photos.right, user.id, "right");
      if (photos.left) photoUrls.left = await uploadPhoto(photos.left, user.id, "left");
      await saveCheckIn(user.id, photoUrls);
      setHasCheckedInToday(true);
      setExistingPhotos((prev) => ({ ...prev, ...photoUrls }));
      
      // Check if both conditions are met and update streak accordingly
      await checkAndUpdateStreak();
      
      toast({ title: "Success", description: "Photos uploaded successfully!" });
    } catch (error) {
      console.error("Error uploading photos:", error);
      toast({ title: "Error", description: "Failed to upload photos. Please try again.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRoutineComplete = async (steps: { label: string; completed: boolean }[]) => {
    if (!user?.id) return;
    const allCompleted = steps.length > 0 && steps.every((s) => s.completed);
    setRoutineCompleted(allCompleted);
    try {
      await updateCheckInRoutine(user.id, allCompleted);
      // Only mark as checked in and update streak if all routine steps are completed
      if (allCompleted) {
        setHasCheckedInToday(true);
        // Check if both conditions are met and update streak accordingly
        await checkAndUpdateStreak();
      }
    } catch (e) {
      console.error("Routine save:", e);
    }
  };

  const handleRoutineSave = async (steps: string[]) => {
    if (!user?.id) return;
    try {
      await saveProfileRoutine(user.id, steps);
      setSavedRoutineSteps(steps);
      toast({ title: "Routine saved" });
    } catch (e) {
      console.error("Routine save:", e);
      toast({ title: "Could not save routine", variant: "destructive" });
    }
  };

  // Notification handlers for the component
  const markAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    try {
      await markAllNotificationsAsRead(user.id);
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const clearNotifications = async () => {
    if (!user?.id) return;
    try {
      await clearAllNotifications(user.id);
      setNotifications([]);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  // Helper function to format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const handleUserMenuClick = () => {
    navigate("/settings");
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
      toast({ title: "Logged out", description: "You have been successfully logged out" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to logout", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="relative h-48 sm:h-56 lg:h-64 overflow-hidden">
        <img
          src={heroImage}
          alt="Skincare products"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
        
        <div className="absolute inset-0 flex items-end">
          <div className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-1 sm:mb-2">
                    Hi <span className="text-primary">{user?.name || 'User'}</span>, let's glow
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    You're building something beautiful, one day at a time.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <NotificationDropdown
                    notifications={notifications}
                    onMarkAsRead={markAsRead}
                    onMarkAllAsRead={markAllAsRead}
                    onClearAll={clearNotifications}
                  />
                  <div className="relative">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="bg-background/50 backdrop-blur h-9 w-9 sm:h-10 sm:w-10"
                      onClick={handleUserMenuClick}
                      title="User Menu"
                    >
                      <User size={18} className="sm:w-5 sm:h-5" />
                    </Button>
                    {/* Dropdown menu could be added here for more options */}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Streak Warning */}
        {userData.daysMissed > 0 && (
          <div className="mb-4 sm:mb-6">
            <StreakWarning daysMissed={userData.daysMissed} />
          </div>
        )}

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-8 space-y-4 sm:space-y-6">
            {/* Streak Section */}
            <StreakSection
              currentStreak={userData.currentStreak}
              longestStreak={userData.longestStreak}
              totalDays={userData.totalDays}
            />

            {/* AI Insights Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <InsightCard
                type="positive"
                message={insightMessage || "Keep tracking. Consistency is key to seeing results."}
              />
              <InsightCard
                title="Product Fit"
                type="neutral"
                message="Evaluate products in the Products page. we’ll match them to your skin type and goals."
              />
            </div>

            {/* Progress Card */}
            <ProgressCard
              metrics={metrics}
              daysTracked={userData.daysTracked}
              progressData={progressHistory}
            />
          </div>

          {/* Right Column - Check-in */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-8">
              <CheckInCard
                hasCheckedInToday={hasCheckedInToday}
                onPhotoUpload={handlePhotoUpload}
                onRoutineComplete={handleRoutineComplete}
                onRoutineSave={handleRoutineSave}
                existingPhotos={existingPhotos}
                existingRoutineCompleted={todayRoutineCompleted}
                savedRoutineSteps={savedRoutineSteps}
                isUploading={isUploading}
              />
            </div>
          </div>
        </div>

        {/* Motivational Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center py-8 sm:py-12 mt-6 sm:mt-8 border-t border-border"
        >
          <p className="text-sm sm:text-base text-muted-foreground">
            You showed up for yourself today.{" "}
            <span className="text-primary font-medium">That matters.</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
