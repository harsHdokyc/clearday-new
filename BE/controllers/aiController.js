import Analytics from '../models/Analytics.js';
import DailyLog from '../models/DailyLog.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

class AIController {
  // Store progress analysis from frontend AI processing
  async storeProgressAnalysis(req, res) {
    const auth = req.auth();
    const userId = auth.userId;
    
    try {
      const { analysis } = req.body;
      
      if (!analysis) {
        logger.warn('[STORE_PROGRESS_ANALYSIS] Missing analysis data', { userId });
        return res.status(400).json({ 
          error: 'Bad Request',
          message: 'Analysis data is required'
        });
      }
      
      const analytics = await Analytics.findOne({ userId });
      if (!analytics) {
        logger.warn('[STORE_PROGRESS_ANALYSIS] User analytics not found', { userId });
        return res.status(404).json({ 
          error: 'Not Found',
          message: 'User analytics not found'
        });
      }
      
      const date = new Date().toISOString().split('T')[0];
      
      // Validate and normalize trend values to match enum
      const validTrends = ['increasing', 'decreasing', 'stable', 'mild', 'moderate', 'severe'];
      const normalizeTrend = (trend) => {
        if (!trend) return undefined;
        const normalized = trend.toLowerCase().trim();
        return validTrends.includes(normalized) ? normalized : undefined;
      };
      
      const acneTrend = normalizeTrend(analysis.acneTrend);
      const rednessTrend = normalizeTrend(analysis.rednessTrend);
      
      // Store progress metrics in Analytics
      const newMetric = {
        date,
        ...(acneTrend && { acneTrend }),
        ...(rednessTrend && { rednessTrend }),
        insightMessage: analysis.insightMessage || 'No insight available'
      };
      
      analytics.progressMetrics.push(newMetric);
      await analytics.save();
      
      // Also update DailyLog with acneLevel and rednessLevel if provided
      if (analysis.acneLevel !== undefined || analysis.rednessLevel !== undefined) {
        const updateData = {};
        if (analysis.acneLevel !== undefined) {
          updateData.acneLevel = analysis.acneLevel;
        }
        if (analysis.rednessLevel !== undefined) {
          updateData.rednessLevel = analysis.rednessLevel;
        }
        
        await DailyLog.findOneAndUpdate(
          { userId, date },
          { $set: updateData },
          { new: true }
        );
      }
      
      res.status(201).json({
        success: true,
        message: 'Progress analysis stored successfully'
      });
    } catch (error) {
      logger.error('[STORE_PROGRESS_ANALYSIS] Failed to store progress analysis', error, { userId });
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to store progress analysis'
      });
    }
  }

  // Store product evaluation from frontend AI processing
  async storeProductEvaluation(req, res) {
    const auth = req.auth();
    const userId = auth.userId;
    
    try {
      const { evaluation, productName } = req.body;
      
      if (!evaluation || !productName) {
        logger.warn('[STORE_PRODUCT_EVALUATION] Missing required data', { 
          userId, 
          hasEvaluation: !!evaluation,
          hasProductName: !!productName 
        });
        return res.status(400).json({ 
          error: 'Bad Request',
          message: 'Evaluation data and product name are required'
        });
      }
      
      const analytics = await Analytics.findOne({ userId });
      if (!analytics) {
        logger.warn('[STORE_PRODUCT_EVALUATION] User analytics not found', { userId });
        return res.status(404).json({ 
          error: 'Not Found',
          message: 'User analytics not found'
        });
      }
      
      const date = new Date().toISOString().split('T')[0];
      analytics.productEvaluations.push({
        date,
        productName,
        ...evaluation
      });
      await analytics.save();
      
      logger.info('[STORE_PRODUCT_EVALUATION] Product evaluation stored successfully', { 
        userId, 
        productName,
        date,
        evaluationsCount: analytics.productEvaluations.length 
      });
      
      res.status(201).json({
        success: true,
        message: 'Product evaluation stored successfully'
      });
    } catch (error) {
      logger.error('[STORE_PRODUCT_EVALUATION] Failed to store product evaluation', error, { 
        userId,
        productName: req.body.productName 
      });
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to store product evaluation'
      });
    }
  }

  // Get user data for frontend AI processing
  async getUserDataForAI(req, res) {
    const auth = req.auth();
    const userId = auth.userId;
    
    try {
      const user = await User.findOne({ clerkId: userId });
      const analytics = await Analytics.findOne({ userId });
      const recentLogs = await DailyLog.find({ userId })
        .sort({ date: -1 })
        .limit(7);
      
      if (!user) {
        logger.warn('[GET_USER_DATA_FOR_AI] User not found', { userId });
        return res.status(404).json({ 
          error: 'Not Found',
          message: 'User not found'
        });
      }
      
      logger.info('[GET_USER_DATA_FOR_AI] User data retrieved successfully', { 
        userId,
        recentLogsCount: recentLogs.length,
        hasAnalytics: !!analytics 
      });
      
      res.status(200).json({
        success: true,
        data: {
          userProfile: {
            skinGoal: user?.profile?.skinGoal,
            skinType: user?.profile?.skinType,
            totalDaysTracked: analytics?.totalDaysTracked || 0
          },
          recentLogs: recentLogs.map(log => ({
            date: log.date,
            acneLevel: log.acneLevel,
            rednessLevel: log.rednessLevel,
            notes: log.notes,
            hasPhoto: !!log.photoUrl
          }))
        }
      });
    } catch (error) {
      logger.error('[GET_USER_DATA_FOR_AI] Failed to fetch user data for AI processing', error, { userId });
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to fetch user data for AI processing'
      });
    }
  }

  // Get user's progress metrics
  async getProgressMetrics(req, res) {
    const auth = req.auth();
    const userId = auth.userId;
    
    try {
      const analytics = await Analytics.findOne({ userId });
      
      if (!analytics) {
        logger.warn('[GET_PROGRESS_METRICS] User analytics not found', { userId });
        return res.status(404).json({ 
          error: 'Not Found',
          message: 'User analytics not found'
        });
      }
      
      logger.info('[GET_PROGRESS_METRICS] Progress metrics retrieved successfully', { 
        userId,
        metricsCount: analytics.progressMetrics?.length || 0,
        totalDaysTracked: analytics.totalDaysTracked 
      });
      
      res.status(200).json({
        success: true,
        data: {
          progressMetrics: analytics.progressMetrics,
          totalDaysTracked: analytics.totalDaysTracked,
          skippedDays: analytics.skippedDays,
          baselineDate: analytics.baselineDate
        }
      });
    } catch (error) {
      logger.error('[GET_PROGRESS_METRICS] Failed to fetch progress metrics', error, { userId });
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to fetch progress metrics'
      });
    }
  }

  // Get user's product evaluations
  async getProductEvaluations(req, res) {
    const auth = req.auth();
    const userId = auth.userId;
    
    try {
      const analytics = await Analytics.findOne({ userId });
      
      if (!analytics) {
        logger.warn('[GET_PRODUCT_EVALUATIONS] User analytics not found', { userId });
        return res.status(404).json({ 
          error: 'Not Found',
          message: 'User analytics not found'
        });
      }
      
      logger.info('[GET_PRODUCT_EVALUATIONS] Product evaluations retrieved successfully', { 
        userId,
        evaluationsCount: analytics.productEvaluations?.length || 0 
      });
      
      res.status(200).json({
        success: true,
        data: {
          productEvaluations: analytics.productEvaluations
        }
      });
    } catch (error) {
      logger.error('[GET_PRODUCT_EVALUATIONS] Failed to fetch product evaluations', error, { userId });
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to fetch product evaluations'
      });
    }
  }

  // Delete progress metric
  async deleteProgressMetric(req, res) {
    const auth = req.auth();
    const userId = auth.userId;
    
    try {
      const { metricId } = req.params;
      
      const analytics = await Analytics.findOne({ userId });
      if (!analytics) {
        logger.warn('[DELETE_PROGRESS_METRIC] User analytics not found', { userId, metricId });
        return res.status(404).json({ 
          error: 'Not Found',
          message: 'User analytics not found'
        });
      }
      
      const beforeCount = analytics.progressMetrics.length;
      analytics.progressMetrics = analytics.progressMetrics.filter(
        metric => metric._id.toString() !== metricId
      );
      const afterCount = analytics.progressMetrics.length;
      await analytics.save();
      
      if (beforeCount === afterCount) {
        logger.warn('[DELETE_PROGRESS_METRIC] Metric not found', { userId, metricId });
      } else {
        logger.info('[DELETE_PROGRESS_METRIC] Progress metric deleted successfully', { 
          userId, 
          metricId,
          beforeCount,
          afterCount 
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Progress metric deleted successfully'
      });
    } catch (error) {
      logger.error('[DELETE_PROGRESS_METRIC] Failed to delete progress metric', error, { 
        userId,
        metricId: req.params.metricId 
      });
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to delete progress metric'
      });
    }
  }
}

export default new AIController();
