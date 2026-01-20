import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    ref: 'User'
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  milestones: {
    proofBuilder: {
      unlocked: { type: Boolean, default: false },
      unlockedAt: { type: Date, default: null }
    },
    consistencyMode: {
      unlocked: { type: Boolean, default: false },
      unlockedAt: { type: Date, default: null }
    },
    identityLock: {
      unlocked: { type: Boolean, default: false },
      unlockedAt: { type: Date, default: null }
    },
    ritualMaster: {
      unlocked: { type: Boolean, default: false },
      unlockedAt: { type: Date, default: null }
    }
  },
  realWorldGestures: [{
    type: {
      type: String,
      enum: ['donate_meal', 'plant_tree', 'blanket_donation'],
      required: true
    },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    milestoneTriggered: { type: String, required: true },
    impactUrl: { type: String, default: null } // URL to proof of impact
  }],
  totalGesturesCompleted: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

milestoneSchema.pre('save', function() {
  this.updatedAt = new Date();
});

export default mongoose.model('Milestone', milestoneSchema);
