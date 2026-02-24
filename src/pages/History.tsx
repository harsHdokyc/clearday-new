import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { format, subDays, isSameDay, parseISO } from "date-fns";
import { Calendar, Check, X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getUserCheckIns, getPreviousDayCheckIn } from "@/lib/storage";
import { analyzeSkinProgress } from "@/lib/ai";
import { supabase } from "@/lib/supabase";

type HistoryEntry = {
  date: Date;
  completed: boolean;
  photoUrl: string | null;
  insight: string | null;
  routineSteps: number;
  photoFrontUrl?: string | null;
  photoRightUrl?: string | null;
  photoLeftUrl?: string | null;
};

export default function History() {
  const { user } = useAuth();
  const [historyData, setHistoryData] = useState<HistoryEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [analyzingInsight, setAnalyzingInsight] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    getUserCheckIns(user.id, 30).then((rows) => {
      const byDate = new Map<string, HistoryEntry>();
      rows.forEach((r: { check_in_date: string; routine_completed?: boolean; photo_front_url?: string | null; photo_right_url?: string | null; photo_left_url?: string | null; ai_insight?: string | null }) => {
        const d = String(r.check_in_date).slice(0, 10);
        const date = parseISO(d);
        const photoUrl = r.photo_front_url || r.photo_right_url || r.photo_left_url || null;
        const completed = !!(r.routine_completed || photoUrl);
        byDate.set(d, {
          date,
          completed,
          photoUrl,
          photoFrontUrl: r.photo_front_url,
          photoRightUrl: r.photo_right_url,
          photoLeftUrl: r.photo_left_url,
          insight: r.ai_insight || null, // Don't show fallback "Routine completed" anymore
          routineSteps: r.routine_completed ? 3 : 0,
        });
      });
      // Fill last 30 days so grid is complete
      const out: HistoryEntry[] = [];
      for (let i = 0; i < 30; i++) {
        const d = subDays(new Date(), i);
        const k = format(d, "yyyy-MM-dd");
        out.push(byDate.get(k) || { date: d, completed: false, photoUrl: null, insight: null, routineSteps: 0 });
      }
      out.sort((a, b) => b.date.getTime() - a.date.getTime());
      setHistoryData(out);
    });
  }, [user?.id]);

  const selectedEntry = selectedDate
    ? historyData.find((entry) => isSameDay(entry.date, selectedDate))
    : null;

  // Create chronological version of data for calendar grid (oldest first)
  const chronologicalData = [...historyData].reverse();

  // Generate AI insight for a selected entry
  const generateAIInsight = async (entry: HistoryEntry) => {
    if (!user?.id || !entry.photoFrontUrl || analyzingInsight) return;

    setAnalyzingInsight(true);
    setAnalysisError(null);
    
    try {
      // Get previous day's photos for comparison
      const previousDate = new Date(entry.date);
      previousDate.setDate(previousDate.getDate() - 1);
      const previousDateStr = previousDate.toISOString().split('T')[0];
      
      const { data: previousData } = await supabase
        .from('check_ins')
        .select('photo_front_url, photo_right_url, photo_left_url')
        .eq('user_id', user.id)
        .eq('check_in_date', previousDateStr)
        .maybeSingle();

      const previousPhotos = previousData ? {
        front: previousData.photo_front_url || undefined,
        right: previousData.photo_right_url || undefined,
        left: previousData.photo_left_url || undefined,
      } : undefined;

      const currentPhotos = {
        front: entry.photoFrontUrl || undefined,
        right: entry.photoRightUrl || undefined,
        left: entry.photoLeftUrl || undefined,
      };

      // Generate AI analysis
      const analysis = await analyzeSkinProgress(currentPhotos, previousPhotos);
      
      // Save the insight to database
      const dateStr = format(entry.date, 'yyyy-MM-dd');
      const { error } = await supabase
        .from('check_ins')
        .update({ ai_insight: analysis.insight })
        .eq('user_id', user.id)
        .eq('check_in_date', dateStr);
        
      if (error) {
        throw new Error(`Failed to save AI insight: ${error.message}`);
      }

      // Update local state
      setHistoryData(prev => prev.map(h => 
        isSameDay(h.date, entry.date) 
          ? { ...h, insight: analysis.insight }
          : h
      ));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate AI insight';
      console.error('Error generating AI insight:', error);
      setAnalysisError(errorMessage);
    } finally {
      setAnalyzingInsight(false);
    }
  };

  const completedDays = historyData.filter((d) => d.completed).length;
  const completionRate = Math.round((completedDays / historyData.length) * 100);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
                Your History
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Track your skincare journey over the last 30 days
              </p>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="bg-card rounded-xl px-4 sm:px-5 py-2 sm:py-3 shadow-soft">
                <p className="text-xl sm:text-2xl font-display font-bold text-foreground">
                  {completionRate}%
                </p>
                <p className="text-xs text-muted-foreground">Completion</p>
              </div>
              <div className="bg-card rounded-xl px-4 sm:px-5 py-2 sm:py-3 shadow-soft">
                <p className="text-xl sm:text-2xl font-display font-bold text-foreground">
                  {completedDays}
                </p>
                <p className="text-xs text-muted-foreground">Days logged</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
          {/* Calendar Grid */}
          <div className="lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-2xl p-4 sm:p-6 shadow-soft"
            >
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="font-display text-lg sm:text-xl font-semibold flex items-center gap-2">
                  <Calendar size={18} className="sm:w-5 sm:h-5 text-primary" />
                  Last 30 Days
                </h2>
                <div className="flex gap-1 sm:gap-2">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="text-xs sm:text-sm h-8"
                  >
                    Grid
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="text-xs sm:text-sm h-8"
                  >
                    List
                  </Button>
                </div>
              </div>

              {viewMode === "grid" ? (
                <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
                  {/* Day headers */}
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                    <div key={i} className="text-center text-xs text-muted-foreground py-1 sm:py-2">
                      <span className="sm:hidden">{day}</span>
                      <span className="hidden sm:inline">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}</span>
                    </div>
                  ))}
                  
                  {/* Fill empty days at start - use oldest date to determine start day */}
                  {Array.from({ length: chronologicalData[0]?.date.getDay() || 0 }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}
                  
                  {/* Actual days in chronological order for calendar layout */}
                  {chronologicalData.map((entry, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.02 }}
                      onClick={() => {
                        setSelectedDate(entry.date);
                        if (entry.photoUrl && !entry.insight) {
                          generateAIInsight(entry);
                        }
                      }}
                      className={cn(
                        "aspect-square rounded-lg sm:rounded-xl relative overflow-hidden transition-all group",
                        entry.completed
                          ? "bg-success/20 hover:bg-success/30"
                          : "bg-muted hover:bg-muted/80",
                        selectedDate && isSameDay(entry.date, selectedDate)
                          ? "ring-2 ring-primary ring-offset-1 sm:ring-offset-2"
                          : ""
                      )}
                    >
                      {entry.photoUrl ? (
                        <img
                          src={entry.photoUrl}
                          alt={`Day ${index + 1}`}
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                        />
                      ) : null}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-display text-xs sm:text-sm font-semibold text-foreground">
                          {format(entry.date, "d")}
                        </span>
                      </div>
                      {entry.completed && (
                        <div className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 h-3 w-3 sm:h-4 sm:w-4 rounded-full bg-success flex items-center justify-center">
                          <Check size={8} className="sm:w-2.5 sm:h-2.5 text-success-foreground" />
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] sm:max-h-[500px] overflow-y-auto">
                  {historyData.map((entry, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      onClick={() => {
                        setSelectedDate(entry.date);
                        if (entry.photoUrl && !entry.insight) {
                          generateAIInsight(entry);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl transition-all",
                        entry.completed
                          ? "bg-success/10 hover:bg-success/15"
                          : "bg-muted/50 hover:bg-muted",
                        selectedDate && isSameDay(entry.date, selectedDate)
                          ? "ring-2 ring-primary"
                          : ""
                      )}
                    >
                      <div className={cn(
                        "h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center",
                        entry.completed ? "bg-success text-success-foreground" : "bg-muted-foreground/20"
                      )}>
                        {entry.completed ? <Check size={16} className="sm:w-[18px] sm:h-[18px]" /> : <X size={16} className="sm:w-[18px] sm:h-[18px]" />}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium text-foreground text-sm sm:text-base truncate">
                          {format(entry.date, "EEEE, MMM d")}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {entry.completed
                            ? `${entry.routineSteps}/3 steps completed`
                            : "No check-in"}
                        </p>
                      </div>
                      {entry.insight && (
                        <span className="hidden sm:block text-xs text-muted-foreground bg-background px-2 py-1 rounded truncate max-w-[150px]">
                          {entry.insight}
                        </span>
                      )}
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Selected Day Detail */}
          <div className="lg:col-span-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl p-4 sm:p-6 shadow-soft lg:sticky lg:top-8"
            >
              {selectedEntry ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-base sm:text-lg font-semibold">
                      {format(selectedEntry.date, "MMMM d, yyyy")}
                    </h3>
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-1 rounded-full",
                        selectedEntry.completed
                          ? "bg-success/20 text-success"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {selectedEntry.completed ? "Completed" : "Missed"}
                    </span>
                  </div>

                  {selectedEntry.photoUrl ? (
                    <div className="aspect-square rounded-xl overflow-hidden mb-4">
                      <img
                        src={selectedEntry.photoUrl}
                        alt="Daily photo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square rounded-xl bg-muted flex items-center justify-center mb-4">
                      <p className="text-muted-foreground text-sm">No photo</p>
                    </div>
                  )}

                  {selectedEntry.insight ? (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={14} className="text-primary" />
                        <span className="text-xs font-medium text-primary uppercase">AI Insight</span>
                      </div>
                      <p className="text-sm text-foreground">{selectedEntry.insight}</p>
                    </div>
                  ) : selectedEntry.photoUrl ? (
                    <div className="bg-muted/50 border border-muted rounded-xl p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={14} className="text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground uppercase">AI Analysis</span>
                      </div>
                      
                      {analysisError ? (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-3">
                          <p className="text-sm text-destructive">{analysisError}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mb-3">
                          Get personalized skin analysis for this photo
                        </p>
                      )}
                      
                      <Button
                        onClick={() => generateAIInsight(selectedEntry)}
                        disabled={analyzingInsight}
                        size="sm"
                        className="w-full"
                      >
                        {analyzingInsight ? (
                          <>
                            <Loader2 size={14} className="mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} className="mr-2" />
                            Generate AI Insight
                          </>
                        )}
                      </Button>
                    </div>
                  ) : null}

                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Routine steps: {selectedEntry.routineSteps}/3 completed
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <Calendar size={40} className="sm:w-12 sm:h-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Select a day to view details
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
