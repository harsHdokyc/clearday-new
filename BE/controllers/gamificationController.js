import Milestone from '../models/Milestone.js';
import Analytics from '../models/Analytics.js';
import { calculateStreak } from '../utils/streakCalculator.js';
import logger from '../utils/logger.js';

class GamificationController {
  // Check and update milestones based on streak
  async updateMilestones(req, res) {
    try {
      const auth = req.auth();
      if (!auth || !auth.userId) {
        logger.warn('[UPDATE_MILESTONES] Unauthorized - missing auth', {});
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User authentication required'
        });
      }
      
      const userId = auth.userId;
      
      // Get current analytics
      const analytics = await Analytics.findOne({ userId });
      if (!analytics) {
        logger.warn('[UPDATE_MILESTONES] User analytics not found', { userId });
        return res.status(404).json({ 
          error: 'Not Found',
          message: 'User analytics not found'
        });
      }
      
      // Calculate actual streak from DailyLog entries
      const currentStreak = await calculateStreak(userId);
      
      // Get or create milestone record
      let milestone = await Milestone.findOne({ userId });
      if (!milestone) {
        milestone = new Milestone({ userId });
      }
      
      const previousStreak = milestone.currentStreak;
      milestone.currentStreak = currentStreak;
      
      // Update longest streak
      if (currentStreak > milestone.longestStreak) {
        milestone.longestStreak = currentStreak;
      }
      
      // Check milestone unlocks
      const newlyUnlocked = [];
      
      // 3 days - Proof Builder
      if (currentStreak >= 3 && !milestone.milestones.proofBuilder.unlocked) {
        milestone.milestones.proofBuilder.unlocked = true;
        milestone.milestones.proofBuilder.unlockedAt = new Date();
        newlyUnlocked.push({
          name: 'Proof Builder',
          days: 3,
          message: 'You\'ve built proof of commitment! Your consistency is showing.'
        });
        logger.info('[UPDATE_MILESTONES] Milestone unlocked: Proof Builder', { userId, streak: currentStreak });
      }
      
      // 7 days - Consistency Mode
      if (currentStreak >= 7 && !milestone.milestones.consistencyMode.unlocked) {
        milestone.milestones.consistencyMode.unlocked = true;
        milestone.milestones.consistencyMode.unlockedAt = new Date();
        newlyUnlocked.push({
          name: 'Consistency Mode',
          days: 7,
          message: 'One week of dedication! You\'re in consistency mode.'
        });
        logger.info('[UPDATE_MILESTONES] Milestone unlocked: Consistency Mode', { userId, streak: currentStreak });
      }
      
      // 14 days - Identity Lock
      if (currentStreak >= 14 && !milestone.milestones.identityLock.unlocked) {
        milestone.milestones.identityLock.unlocked = true;
        milestone.milestones.identityLock.unlockedAt = new Date();
        newlyUnlocked.push({
          name: 'Identity Lock',
          days: 14,
          message: 'Two weeks! Skincare is now part of your identity.'
        });
        logger.info('[UPDATE_MILESTONES] Milestone unlocked: Identity Lock', { userId, streak: currentStreak });
      }
      
      // 30 days - Ritual Master
      if (currentStreak >= 30 && !milestone.milestones.ritualMaster.unlocked) {
        milestone.milestones.ritualMaster.unlocked = true;
        milestone.milestones.ritualMaster.unlockedAt = new Date();
        newlyUnlocked.push({
          name: 'Ritual Master',
          days: 30,
          message: 'One month complete! You\'re a true ritual master.'
        });
        logger.info('[UPDATE_MILESTONES] Milestone unlocked: Ritual Master', { userId, streak: currentStreak });
      }
      
      await milestone.save();
      
      logger.info('[UPDATE_MILESTONES] Milestones updated successfully', { 
        userId, 
        currentStreak,
        previousStreak,
        newlyUnlockedCount: newlyUnlocked.length,
        streakIncreased: currentStreak > previousStreak 
      });
      
      res.status(200).json({
        success: true,
        data: {
          milestone,
          newlyUnlocked,
          streakIncreased: currentStreak > previousStreak
        }
      });
    } catch (error) {
      logger.error('[UPDATE_MILESTONES] Failed to update milestones', error, { 
        userId: req.auth()?.userId 
      });
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to update milestones'
      });
    }
  }

  // Get user's gamification status
  async getGamificationStatus(req, res) {
    try {
      const auth = req.auth();
      if (!auth || !auth.userId) {
        logger.warn('[GET_GAMIFICATION_STATUS] Unauthorized - missing auth', {});
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User authentication required'
        });
      }
      
      const userId = auth.userId;
      
      const milestone = await Milestone.findOne({ userId });
      
      if (!milestone) {
        // Create initial milestone record
        logger.debug('[GET_GAMIFICATION_STATUS] Creating initial milestone record', { userId });
        const newMilestone = new Milestone({ userId });
        await newMilestone.save();
        
        logger.info('[GET_GAMIFICATION_STATUS] Initial milestone created', { userId });
        return res.status(200).json({
          success: true,
          data: {
            milestone: newMilestone,
            currentStreak: 0,
            nextMilestone: {
              name: 'Proof Builder',
              days: 3,
              progress: 0
            }
          }
        });
      }
      
      const analytics = await Analytics.findOne({ userId });
      
      // Calculate actual streak from DailyLog entries
      const currentStreak = await calculateStreak(userId);
      
      // Determine next milestone
      let nextMilestone = null;
      if (!milestone.milestones.proofBuilder.unlocked) {
        nextMilestone = {
          name: 'Proof Builder',
          days: 3,
          progress: Math.min((currentStreak / 3) * 100, 100)
        };
      } else if (!milestone.milestones.consistencyMode.unlocked) {
        nextMilestone = {
          name: 'Consistency Mode',
          days: 7,
          progress: Math.min((currentStreak / 7) * 100, 100)
        };
      } else if (!milestone.milestones.identityLock.unlocked) {
        nextMilestone = {
          name: 'Identity Lock',
          days: 14,
          progress: Math.min((currentStreak / 14) * 100, 100)
        };
      } else if (!milestone.milestones.ritualMaster.unlocked) {
        nextMilestone = {
          name: 'Ritual Master',
          days: 30,
          progress: Math.min((currentStreak / 30) * 100, 100)
        };
      }
      
      logger.info('[GET_GAMIFICATION_STATUS] Gamification status retrieved successfully', { 
        userId,
        currentStreak,
        nextMilestone: nextMilestone?.name,
        totalGesturesCompleted: milestone.totalGesturesCompleted
      });
      
      // Update milestone's currentStreak if calculated streak is different
      const oldStreak = milestone.currentStreak;
      if (oldStreak !== currentStreak) {
        milestone.currentStreak = currentStreak;
        if (currentStreak > milestone.longestStreak) {
          milestone.longestStreak = currentStreak;
        }
        await milestone.save();
        logger.info('[GET_GAMIFICATION_STATUS] Updated milestone streak', { 
          userId, 
          oldStreak, 
          newStreak: currentStreak 
        });
      }
      
      res.status(200).json({
        success: true,
        data: {
          milestone,
          currentStreak,
          nextMilestone,
          totalGesturesCompleted: milestone.totalGesturesCompleted
        }
      });
    } catch (error) {
      logger.error('[GET_GAMIFICATION_STATUS] Failed to fetch gamification status', error, { 
        userId: req.auth()?.userId 
      });
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to fetch gamification status'
      });
    }
  }

  // Complete a real-world gesture
  async completeGesture(req, res) {
    try {
      const { gestureType, milestoneTriggered } = req.body;
      const auth = req.auth();
      if (!auth || !auth.userId) {
        logger.warn('[COMPLETE_GESTURE] Unauthorized - missing auth', {});
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User authentication required'
        });
      }
      
      const userId = auth.userId;
      
      if (!gestureType || !milestoneTriggered) {
        logger.warn('[COMPLETE_GESTURE] Missing required parameters', { 
          userId, 
          hasGestureType: !!gestureType,
          hasMilestoneTriggered: !!milestoneTriggered 
        });
        return res.status(400).json({ 
          error: 'Bad Request',
          message: 'Gesture type and milestone triggered are required'
        });
      }
      
      const milestone = await Milestone.findOne({ userId });
      if (!milestone) {
        logger.warn('[COMPLETE_GESTURE] Milestone record not found', { userId });
        return res.status(404).json({ 
          error: 'Not Found',
          message: 'Milestone record not found'
        });
      }
      
      // Check if this gesture was already completed
      const existingGesture = milestone.realWorldGestures.find(
        g => g.type === gestureType && g.milestoneTriggered === milestoneTriggered
      );
      
      if (existingGesture && existingGesture.completed) {
        logger.warn('[COMPLETE_GESTURE] Gesture already completed', { 
          userId, 
          gestureType, 
          milestoneTriggered 
        });
        return res.status(400).json({ 
          error: 'Bad Request',
          message: 'This gesture has already been completed'
        });
      }
      
      // Add or update gesture
      if (existingGesture) {
        existingGesture.completed = true;
        existingGesture.completedAt = new Date();
        logger.debug('[COMPLETE_GESTURE] Updating existing gesture', { userId, gestureType });
      } else {
        milestone.realWorldGestures.push({
          type: gestureType,
          completed: true,
          completedAt: new Date(),
          milestoneTriggered
        });
        logger.debug('[COMPLETE_GESTURE] Adding new gesture', { userId, gestureType });
      }
      
      milestone.totalGesturesCompleted += 1;
      await milestone.save();
      
      // Generate impact URL (in real implementation, this would integrate with actual APIs)
      const impactUrl = this.generateImpactUrl(gestureType);
      
      logger.info('[COMPLETE_GESTURE] Gesture completed successfully', { 
        userId,
        gestureType,
        milestoneTriggered,
        totalGesturesCompleted: milestone.totalGesturesCompleted 
      });
      
      res.status(200).json({
        success: true,
        data: {
          gesture: {
            type: gestureType,
            milestoneTriggered,
            completed: true,
            impactUrl
          },
          totalGesturesCompleted: milestone.totalGesturesCompleted,
          message: this.getGestureMessage(gestureType)
        }
      });
    } catch (error) {
      logger.error('[COMPLETE_GESTURE] Failed to complete gesture', error, { 
        userId: req.auth()?.userId,
        gestureType: req.body.gestureType 
      });
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to complete gesture'
      });
    }
  }

  // Helper method to generate impact URLs
  generateImpactUrl(gestureType) {
    const urls = {
      donate_meal: 'https://www.foodbanking.org/donate/',
      plant_tree: 'https://www.onetreeplanted.org/',
      blanket_donation: 'https://www.salvationarmyusa.org/usn/donate/'
    };
    return urls[gestureType] || '#';
  }

  // Helper method to get gesture completion messages
  getGestureMessage(gestureType) {
    const messages = {
      donate_meal: 'Thank you! Your gesture will help provide a meal to someone in need.',
      plant_tree: 'Amazing! A tree will be planted thanks to your consistency.',
      blanket_donation: 'Wonderful! Your gesture will provide warmth to someone in need.'
    };
    return messages[gestureType] || 'Thank you for making a positive impact!';
  }
}

export default new GamificationController();
