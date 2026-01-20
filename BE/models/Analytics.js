import mongoose from 'mongoose';

const progressMetricSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true
  },
  acneTrend: {
    type: String,
    enum: ['increasing', 'decreasing', 'stable', 'mild', 'moderate', 'severe']
  },
  rednessTrend: {
    type: String,
    enum: ['increasing', 'decreasing', 'stable', 'mild', 'moderate', 'severe']
  },
  insightMessage: {
    type: String,
    required: true
  }
});

const productEvaluationSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  fitScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  insightMessage: {
    type: String,
    required: true
  }
});

const analyticsSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    ref: 'User'
  },
  baselineDate: {
    type: String,
    required: true
  },
  totalDaysTracked: {
    type: Number,
    default: 0
  },
  skippedDays: {
    type: Number,
    default: 0
  },
  isReset: {
    type: Boolean,
    default: false
  },
  progressMetrics: [progressMetricSchema],
  productEvaluations: [productEvaluationSchema]
});

export default mongoose.model('Analytics', analyticsSchema);
