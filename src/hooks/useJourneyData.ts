import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getStreakData, type StreakData } from '@/lib/streaks';
import { 
  Star, 
  Zap, 
  Target, 
  Flame, 
  Trophy, 
  Sparkles, 
  Crown, 
  Heart, 
  TreePine, 
  Gift 
} from 'lucide-react';

interface Milestone {
  days: number;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  reward?: string;
  goodDeed?: { icon: React.ElementType; label: string };
  unlocked: boolean;
  current: boolean;
}

const MILESTONE_CONFIGS = [
  {
    days: 1,
    title: "First Step",
    subtitle: "You showed up!",
    reward: undefined,
    goodDeed: undefined,
  },
  {
    days: 3,
    title: "Proof Builder",
    subtitle: "Consistency begins",
    reward: "Unlocked: Basic AI Insights",
    goodDeed: undefined,
  },
  {
    days: 5,
    title: "Building Momentum",
    subtitle: "You're on a roll",
    reward: undefined,
    goodDeed: undefined,
  },
  {
    days: 7,
    title: "Consistency Mode",
    subtitle: "One week strong",
    reward: "Unlocked: Weekly Progress Reports",
    goodDeed: { label: "Donate a meal" },
  },
  {
    days: 14,
    title: "Identity Lock",
    subtitle: "This is who you are now",
    reward: "Unlocked: Product Recommendations",
    goodDeed: { label: "Plant a tree" },
  },
  {
    days: 21,
    title: "Habit Formed",
    subtitle: "Science says it's a habit",
    reward: "Unlocked: Advanced Analytics",
    goodDeed: undefined,
  },
  {
    days: 30,
    title: "Ritual Master",
    subtitle: "One month of dedication",
    reward: "Unlocked: All Features",
    goodDeed: { label: "Blanket donation" },
  },
];

export function useJourneyData() {
  const { user } = useAuth();
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setStreakData(null);
      setIsLoading(false);
      return;
    }

    const fetchStreakData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getStreakData(user.id);
        setStreakData(data);
      } catch (err) {
        console.error('Error fetching streak data:', err);
        setError('Failed to load journey data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStreakData();
  }, [user]);

  const milestones: Milestone[] = MILESTONE_CONFIGS.map((config, index) => {
    const currentStreak = streakData?.currentStreak || 0;
    const unlocked = currentStreak >= config.days;
    const isNextMilestone = !unlocked && 
      (index === 0 || MILESTONE_CONFIGS[index - 1].days <= currentStreak);
    
    // Static icon mapping
    const getIcon = () => {
      switch (config.days) {
        case 1: return Star;
        case 3: return Zap;
        case 5: return Target;
        case 7: return Flame;
        case 14: return Trophy;
        case 21: return Sparkles;
        case 30: return Crown;
        default: return Star;
      }
    };

    const getGoodDeedIcon = () => {
      if (!config.goodDeed) return undefined;
      switch (config.goodDeed.label) {
        case "Donate a meal": return Heart;
        case "Plant a tree": return TreePine;
        case "Blanket donation": return Gift;
        default: return Heart;
      }
    };

    return {
      ...config,
      icon: getIcon(),
      goodDeed: config.goodDeed ? {
        icon: getGoodDeedIcon()!,
        label: config.goodDeed.label
      } : undefined,
      unlocked,
      current: isNextMilestone,
    };
  });

  const nextMilestone = milestones.find(m => !m.unlocked);

  return {
    streakData,
    milestones,
    nextMilestone,
    isLoading,
    error,
    currentStreak: streakData?.currentStreak || 0,
    longestStreak: streakData?.longestStreak || 0,
    totalDays: streakData?.totalDays || 0,
    daysMissed: streakData?.daysMissed || 0,
  };
}
