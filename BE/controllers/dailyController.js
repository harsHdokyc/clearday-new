import DailyLog from '../models/DailyLog.js';
import Analytics from '../models/Analytics.js';
import multer from 'multer';
import { calculateStreak, calculateSkippedDays } from '../utils/streakCalculator.js';
import logger from '../utils/logger.js';

class DailyController {
  constructor() {
    // Configure multer for file uploads
    this.storage = multer.memoryStorage();
    this.upload = multer({ 
      storage: this.storage,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'));
        }
      }
    });
  }

  // Upload daily photo (supports single photo or multi-view)
  async uploadPhoto(req, res) {
    const auth = req.auth();
    const userId = auth.userId;
    
    try {
      const { date, view } = req.body; // view can be 'front', 'right', 'left', or undefined (backward compatibility)
      
      if (!date) {
        logger.warn('[UPLOAD_PHOTO] Missing date parameter', { userId });
        return res.status(400).json({ 
          error: 'Bad Request',
          message: 'Date is required'
        });
      }
      
      if (!req.file) {
        logger.warn('[UPLOAD_PHOTO] No file uploaded', { userId, date });
        return res.status(400).json({ 
          error: 'Bad Request',
          message: 'No photo uploaded'
        });
      }
      
      logger.debug('[UPLOAD_PHOTO] File received', { 
        userId, 
        date, 
        view: view || 'single',
        fileName: req.file.originalname, 
        fileSize: req.file.size, 
        mimeType: req.file.mimetype 
      });
      
      const photoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      
      // Check if daily log already exists for this date
      const existingLog = await DailyLog.findOne({ userId, date });
      logger.debug('[UPLOAD_PHOTO] Checking for existing log', { userId, date, exists: !!existingLog });
      
      // Build update object based on view type
      const updateData = {};
      if (view === 'front') {
        updateData.frontView = photoUrl;
        // Also set photoUrl for backward compatibility (use front view as primary)
        updateData.photoUrl = photoUrl;
      } else if (view === 'right') {
        updateData.rightView = photoUrl;
      } else if (view === 'left') {
        updateData.leftView = photoUrl;
      } else {
        // Backward compatibility: single photo upload
        updateData.photoUrl = photoUrl;
      }
      
      // Check if all 3 views already exist (for multi-view uploads)
      if (view && existingLog) {
        const hasAllViews = existingLog.frontView && existingLog.rightView && existingLog.leftView;
        if (hasAllViews && (view === 'front' || view === 'right' || view === 'left')) {
          logger.warn('[UPLOAD_PHOTO] All views already exist for date', { userId, date, view });
          return res.status(409).json({
            error: 'Conflict',
            message: `You have already uploaded all photos for this date`,
            code: 'PHOTO_ALREADY_EXISTS'
          });
        }
      }
      
      // For backward compatibility: check if single photoUrl exists (old format)
      if (!view && existingLog && existingLog.photoUrl) {
        const trimmedUrl = existingLog.photoUrl.trim();
        const isValidPhoto = trimmedUrl.length > 0 && 
          (trimmedUrl.startsWith('data:image/') || trimmedUrl.startsWith('http'));
        
        if (isValidPhoto) {
          logger.warn('[UPLOAD_PHOTO] Photo already exists for date', { userId, date });
          return res.status(409).json({
            error: 'Conflict',
            message: 'You have already uploaded a photo for this date',
            code: 'PHOTO_ALREADY_EXISTS'
          });
        }
      }
      
      // Update existing log or create new one
      const dailyLog = existingLog 
        ? await DailyLog.findOneAndUpdate(
            { userId, date },
            { $set: updateData },
            { new: true }
          )
        : await DailyLog.create({
            userId,
            date,
            ...updateData
          });
      
      logger.info('[UPLOAD_PHOTO] Photo uploaded successfully', { 
        userId, 
        date, 
        action: existingLog ? 'updated' : 'created',
        logId: dailyLog._id 
      });
      
      // Ensure analytics exists (don't increment here - that's done on routine completion)
      let analytics = await Analytics.findOne({ userId });
      if (!analytics) {
        analytics = await Analytics.create({
          userId,
          baselineDate: date
        });
        logger.info('[UPLOAD_PHOTO] Created analytics for user', { userId, baselineDate: date });
      }
      
      res.status(201).json({
        success: true,
        data: dailyLog,
        message: 'Photo uploaded successfully'
      });
    } catch (error) {
      // Handle duplicate key error specifically
      if (error.code === 11000 && error.keyPattern && error.keyPattern.userId && error.keyPattern.date) {
        logger.warn('[UPLOAD_PHOTO] Duplicate key error', { userId, date: req.body.date, errorCode: error.code });
        return res.status(409).json({
          error: 'Conflict',
          message: 'You have already uploaded a photo for this date',
          code: 'PHOTO_ALREADY_EXISTS'
        });
      }
      
      logger.error('[UPLOAD_PHOTO] Failed to upload photo', error, { userId, date: req.body.date });
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to upload photo',
        details: error.message
      });
    }
  }

  // Complete routine steps (partial completion support)
  async completeRoutineSteps(req, res) {
    const auth = req.auth();
    const userId = auth.userId;
    
    try {
      const { date, steps, totalStepsCount, completedStepsCount } = req.body;
      
      if (!date || !steps || totalStepsCount === undefined || completedStepsCount === undefined) {
        logger.warn('[COMPLETE_ROUTINE_STEPS] Missing required parameters', { userId, date });
        return res.status(400).json({ 
          error: 'Bad Request',
          message: 'Date, steps, totalStepsCount, and completedStepsCount are required'
        });
      }
      
      // Check if this date was already marked as completed
      const existingLog = await DailyLog.findOne({ userId, date });
      const wasAlreadyCompleted = existingLog?.routineCompleted || false;
      
      logger.debug('[COMPLETE_ROUTINE_STEPS] Existing log check', { 
        userId, 
        date, 
        wasAlreadyCompleted,
        existingLogId: existingLog?._id 
      });
      
      // Routine is only completed when ALL steps are done (100%)
      const routineCompleted = completedStepsCount === totalStepsCount && totalStepsCount > 0;
      
      const dailyLog = await DailyLog.findOneAndUpdate(
        { userId, date },
        { 
          routineCompleted,
          routineSteps: steps,
          totalSteps: totalStepsCount,
          completedSteps: completedStepsCount,
          // Ensure photoUrl exists if log was created without photo
          ...(existingLog?.photoUrl ? {} : { photoUrl: existingLog?.photoUrl || '' })
        },
        { new: true, upsert: true }
      );
      
      logger.info('[COMPLETE_ROUTINE_STEPS] Routine steps updated', { 
        userId, 
        date, 
        routineCompleted,
        completedStepsCount,
        totalStepsCount,
        wasAlreadyCompleted,
        logId: dailyLog._id
      });
      
      // Update analytics only if routine is completed AND wasn't already completed
      if (routineCompleted && !wasAlreadyCompleted) {
        let analytics = await Analytics.findOne({ userId });
        if (!analytics) {
          analytics = await Analytics.create({
            userId,
            baselineDate: date
          });
          logger.info('[COMPLETE_ROUTINE_STEPS] Created analytics for user', { userId, baselineDate: date });
        }
        // Don't increment here - totalDaysTracked is calculated from actual completed logs
        await analytics.save();
        logger.debug('[COMPLETE_ROUTINE_STEPS] Analytics updated', { userId, date });
      }
      
      res.status(200).json({
        success: true,
        data: dailyLog,
        message: `Completed ${completedStepsCount} of ${totalStepsCount} steps`
      });
    } catch (error) {
      logger.error('[COMPLETE_ROUTINE_STEPS] Failed to complete routine steps', error, { 
        userId, 
        date: req.body.date 
      });
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to complete routine steps'
      });
    }
  }

  // Legacy complete routine (for backward compatibility)
  async completeRoutine(req, res) {
    const auth = req.auth();
    const userId = auth.userId;
    
    try {
      const { date } = req.body;
      
      if (!date) {
        logger.warn('[COMPLETE_ROUTINE] Missing date parameter', { userId });
        return res.status(400).json({ 
          error: 'Bad Request',
          message: 'Date is required'
        });
      }
      
      const dailyLog = await DailyLog.findOneAndUpdate(
        { userId, date },
        { 
          routineCompleted: true,
          routineSteps: {
            cleanser: true,
            treatment: true,
            moisturizer: true,
            sunscreen: false,
            totalSteps: 3,
            completedSteps: 3
          },
          completedSteps: 3
        },
        { new: true, upsert: true }
      );
      
      logger.info('[COMPLETE_ROUTINE] Routine marked as completed', { 
        userId, 
        date, 
        logId: dailyLog._id 
      });
      
      res.status(200).json({
        success: true,
        data: dailyLog,
        message: 'Routine marked as completed'
      });
    } catch (error) {
      logger.error('[COMPLETE_ROUTINE] Failed to complete routine', error, { 
        userId, 
        date: req.body.date 
      });
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to complete routine'
      });
    }
  }


  // Get daily status and analytics
  async getDailyStatus(req, res) {
    const auth = req.auth();
    const userId = auth.userId;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Ensure analytics exists
      let analytics = await Analytics.findOne({ userId });
      if (!analytics) {
        analytics = new Analytics({
          userId,
          baselineDate: today
        });
        await analytics.save();
      }
      
      const todayLog = await DailyLog.findOne({ userId, date: today });
      
      // Calculate actual streak and skipped days
      const streak = await calculateStreak(userId);
      const skippedDays = await calculateSkippedDays(userId);
      
      // Update analytics with calculated values
      analytics.skippedDays = skippedDays;
      // Update totalDaysTracked based on actual completed logs
      const completedLogs = await DailyLog.countDocuments({ 
        userId, 
        routineCompleted: true 
      });
      
      // If user has completed today's routine, reset the isReset flag
      // This allows future resets if they skip 4+ days again
      if (todayLog?.routineCompleted && analytics.isReset) {
        analytics.isReset = false;
      }
      
      // Calculate totalDaysTracked since last reset (or from beginning if never reset)
      if (analytics.isReset) {
        // If reset, count only logs after baselineDate
        const logsSinceReset = await DailyLog.countDocuments({
          userId,
          routineCompleted: true,
          date: { $gte: analytics.baselineDate }
        });
        analytics.totalDaysTracked = logsSinceReset;
      } else {
        analytics.totalDaysTracked = completedLogs;
      }
      
      let datasetWarning = null;
      
      // Check if we need to reset analytics (4+ days skipped)
      if (skippedDays >= 4 && !analytics.isReset) {
        // Delete all DailyLog entries before reset date for true fresh start
        const deletedCount = await DailyLog.deleteMany({
          userId,
          date: { $lt: today }
        });
        
        logger.warn('[GET_DAILY_STATUS] Analytics reset triggered', { 
          userId, 
          skippedDays, 
          deletedLogs: deletedCount.deletedCount,
          resetDate: today 
        });
        
        // Reset analytics completely
        analytics.isReset = true;
        analytics.progressMetrics = []; // Clear AI metrics
        analytics.productEvaluations = []; // Clear product evaluations too
        analytics.baselineDate = today; // New baseline
        analytics.skippedDays = 0; // Reset skipped days counter
        analytics.totalDaysTracked = 0; // Reset tracking
        await analytics.save();
        
        // Also reset milestones for complete fresh start
        const Milestone = (await import('../models/Milestone.js')).default;
        await Milestone.findOneAndUpdate(
          { userId },
          {
            currentStreak: 0,
            longestStreak: 0,
            milestones: {
              proofBuilder: { unlocked: false, unlockedAt: null },
              consistencyMode: { unlocked: false, unlockedAt: null },
              identityLock: { unlocked: false, unlockedAt: null },
              ritualMaster: { unlocked: false, unlockedAt: null }
            },
            realWorldGestures: [],
            totalGesturesCompleted: 0
          },
          { upsert: true }
        );
        
        datasetWarning = `Complete reset. ${deletedCount.deletedCount} previous entries cleared. Starting fresh from today.`;
      } else if (skippedDays === 1) {
        datasetWarning = 'Gentle reminder: You missed yesterday. Try to stay consistent!';
      } else if (skippedDays === 2) {
        datasetWarning = 'Warning: You missed 2 days. Your progress insights may be less accurate.';
      } else if (skippedDays === 3) {
        datasetWarning = 'Final warning: One more missed day will reset your analytics.';
      }
      
      await analytics.save();
      
      logger.info('[GET_DAILY_STATUS] Status retrieved successfully', { 
        userId, 
        streak, 
        skippedDays,
        hasCompletedToday: !!todayLog?.routineCompleted,
        hasUploadedToday: !!todayLog?.photoUrl 
      });
      
      res.status(200).json({
        success: true,
        data: {
          streak,
          skippedDays,
          datasetWarning,
          hasCompletedToday: !!todayLog?.routineCompleted,
          hasUploadedToday: !!todayLog?.photoUrl,
          todayLog: todayLog // Include the full todayLog data
        }
      });
    } catch (error) {
      logger.error('[GET_DAILY_STATUS] Failed to fetch daily status', error, { userId });
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to fetch daily status'
      });
    }
  }

  // Get daily history (last 30 days)
  async getDailyHistory(req, res) {
    const auth = req.auth();
    const userId = auth.userId;
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const today = new Date().toISOString().split('T')[0];
      
      // Ensure analytics exists
      let analytics = await Analytics.findOne({ userId });
      if (!analytics) {
        analytics = await Analytics.create({
          userId,
          baselineDate: today
        });
      }
      
      // Check for reset BEFORE fetching logs (same logic as getDailyStatus)
      const skippedDays = await calculateSkippedDays(userId);
      
      // Trigger reset if needed (4+ days skipped and not already reset)
      if (skippedDays >= 4 && !analytics.isReset) {
        // Delete all DailyLog entries before reset date for true fresh start
        const deleteResult = await DailyLog.deleteMany({
          userId,
          date: { $lt: today }
        });
        
        console.log(`Reset triggered: Deleted ${deleteResult.deletedCount} logs before ${today}`);
        
        // Reset analytics completely
        analytics.isReset = true;
        analytics.progressMetrics = []; // Clear AI metrics
        analytics.productEvaluations = []; // Clear product evaluations
        analytics.baselineDate = today; // New baseline
        analytics.skippedDays = 0; // Reset skipped days counter
        analytics.totalDaysTracked = 0; // Reset tracking
        await analytics.save();
        
        // Also reset milestones for complete fresh start
        const Milestone = (await import('../models/Milestone.js')).default;
        await Milestone.findOneAndUpdate(
          { userId },
          {
            currentStreak: 0,
            longestStreak: 0,
            milestones: {
              proofBuilder: { unlocked: false, unlockedAt: null },
              consistencyMode: { unlocked: false, unlockedAt: null },
              identityLock: { unlocked: false, unlockedAt: null },
              ritualMaster: { unlocked: false, unlockedAt: null }
            },
            realWorldGestures: [],
            totalGesturesCompleted: 0
          },
          { upsert: true }
        );
      }
      
      // After reset, only fetch logs from baselineDate (reset date) onwards
      // This ensures old data is completely hidden
      const baselineDate = analytics?.baselineDate || today;
      
      // If reset has occurred, ensure we delete any logs that might have been missed
      // This handles edge cases where reset happened but some logs weren't deleted
      if (analytics.isReset) {
        const remainingOldLogs = await DailyLog.deleteMany({
          userId,
          date: { $lt: baselineDate }
        });
        if (remainingOldLogs.deletedCount > 0) {
          console.log(`[CLEANUP] User ${userId}: Deleted ${remainingOldLogs.deletedCount} old logs after reset (baselineDate: ${baselineDate})`);
        }
      }
      
      // Only fetch logs from baselineDate onwards (after reset date)
      const logs = await DailyLog.find({ 
        userId,
        date: { $gte: baselineDate } // Only logs from reset date onwards
      }).sort({ date: -1 });
      
      logger.info('[GET_DAILY_HISTORY] History retrieved', { 
        userId, 
        logCount: logs.length, 
        baselineDate, 
        isReset: analytics.isReset, 
        skippedDays 
      });
      
      // Create a map of progressMetrics by date for quick lookup
      // Only include metrics from after the baselineDate (reset date)
      const progressMetricsMap = new Map();
      if (analytics && analytics.progressMetrics) {
        analytics.progressMetrics.forEach(metric => {
          // Only include metrics from after the baselineDate (after reset)
          if (metric.date >= baselineDate) {
            progressMetricsMap.set(metric.date, metric);
          }
        });
      }
      
      // Enhance logs with progressMetrics from analytics
      // All logs are already filtered to be >= baselineDate, so we can safely add metrics
      const enhancedLogs = logs.map(log => {
        const logObj = log.toObject();
        const metrics = progressMetricsMap.get(log.date);
        if (metrics) {
          logObj.progressMetrics = [metrics];
        } else {
          logObj.progressMetrics = [];
        }
        return logObj;
      });
      
      res.status(200).json({
        success: true,
        data: {
          logs: enhancedLogs,
          analytics
        }
      });
    } catch (error) {
      logger.error('[GET_DAILY_HISTORY] Failed to fetch daily history', error, { userId });
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to fetch daily history'
      });
    }
  }

  // Update daily log with additional data
  async updateDailyLog(req, res) {
    const auth = req.auth();
    const userId = auth.userId;
    
    try {
      const { date, acneLevel, rednessLevel, notes } = req.body;
      
      if (!date) {
        logger.warn('[UPDATE_DAILY_LOG] Missing date parameter', { userId });
        return res.status(400).json({ 
          error: 'Bad Request',
          message: 'Date is required'
        });
      }
      
      const dailyLog = await DailyLog.findOneAndUpdate(
        { userId, date },
        { 
          ...(acneLevel !== undefined && { acneLevel }),
          ...(rednessLevel !== undefined && { rednessLevel }),
          ...(notes !== undefined && { notes })
        },
        { new: true, upsert: true }
      );
      
      logger.info('[UPDATE_DAILY_LOG] Daily log updated successfully', { 
        userId, 
        date, 
        logId: dailyLog._id,
        updatedFields: {
          acneLevel: acneLevel !== undefined,
          rednessLevel: rednessLevel !== undefined,
          notes: notes !== undefined
        }
      });
      
      res.status(200).json({
        success: true,
        data: dailyLog,
        message: 'Daily log updated successfully'
      });
    } catch (error) {
      logger.error('[UPDATE_DAILY_LOG] Failed to update daily log', error, { 
        userId, 
        date: req.body.date 
      });
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to update daily log'
      });
    }
  }
}

export default new DailyController();
