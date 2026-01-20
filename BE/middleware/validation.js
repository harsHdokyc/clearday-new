// Request validation schemas
import Joi from 'joi';

// User profile validation
const userProfileSchema = Joi.object({
  clerkId: Joi.string().required(),
  skinGoal: Joi.string().valid('acne', 'glow', 'healthy-skin').required(),
  skinType: Joi.string().valid('oily', 'dry', 'combination', 'sensitive').required()
});

// Daily log validation
const dailyLogSchema = Joi.object({
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  acneLevel: Joi.number().min(0).max(10).optional(),
  rednessLevel: Joi.number().min(0).max(10).optional(),
  notes: Joi.string().max(500).optional()
});

// Routine completion validation
const routineCompletionSchema = Joi.object({
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required()
});

// Routine steps validation (partial completion)
// Allow any step keys since users can add custom routine steps
const routineStepsSchema = Joi.object({
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  steps: Joi.object().pattern(
    Joi.string(), // Any string key (step name)
    Joi.boolean() // Value must be boolean
  ).required(),
  totalStepsCount: Joi.number().integer().min(1).required(),
  completedStepsCount: Joi.number().integer().min(0).required()
});

// AI analysis storage validation
const progressAnalysisSchema = Joi.object({
  analysis: Joi.object().required()
});

const productEvaluationSchema = Joi.object({
  evaluation: Joi.object().required(),
  productName: Joi.string().required()
});

export {
  userProfileSchema,
  dailyLogSchema,
  routineCompletionSchema,
  routineStepsSchema,
  progressAnalysisSchema,
  productEvaluationSchema
};
