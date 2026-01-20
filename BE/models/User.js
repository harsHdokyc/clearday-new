import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  clerkId: {
    type: String,
    required: true,
    unique: true
  },
  profile: {
    skinGoal: {
      type: String,
      enum: ['acne', 'glow', 'healthy-skin'],
      required: true
    },
    skinType: {
      type: String,
      enum: ['oily', 'dry', 'combination', 'sensitive'],
      required: true
    }
  },
  customRoutineSteps: {
    type: [String],
    default: []
  },
  routineOrder: {
    type: [String],
    default: ['cleanser', 'treatment', 'moisturizer', 'sunscreen']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('User', userSchema);
