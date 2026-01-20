import mongoose from 'mongoose';

const dailyLogSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  date: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/
  },
  // Support for single photo (backward compatibility) or multi-view photos
  photoUrl: {
    type: String,
    required: false,
    default: null
  },
  // Multi-view photo support
  frontView: {
    type: String,
    required: false,
    default: null
  },
  rightView: {
    type: String,
    required: false,
    default: null
  },
  leftView: {
    type: String,
    required: false,
    default: null
  },
  routineCompleted: {
    type: Boolean,
    default: false
  },
  // Partial routine completion support - dynamic structure
  routineSteps: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  totalSteps: { 
    type: Number, 
    default: 4 
  },
  completedSteps: { 
    type: Number, 
    default: 0 
  },
  // AI analysis fields
  acneLevel: {
    type: Number,
    min: 0,
    max: 10,
    default: null
  },
  rednessLevel: {
    type: Number,
    min: 0,
    max: 10,
    default: null
  },
  notes: {
    type: String,
    maxlength: 500,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

dailyLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model('DailyLog', dailyLogSchema);
