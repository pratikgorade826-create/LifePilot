const mongoose = require('mongoose');

const tripActivitySchema = new mongoose.Schema({
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  userName: {
    type: String,
    default: 'Traveler'
  },
  action: {
    type: String,
    enum: [
      'MEMBER_JOINED',
      'MEMBER_REMOVED',
      'ROLE_UPDATED',
      'ITINERARY_UPDATED',
      'DAY_REGENERATED',
      'BUDGET_OPTIMIZED',
      'SCENARIO_CREATED',
      'SCENARIO_APPLIED',
      'ORIGINAL_RESTORED',
      'POLL_CREATED',
      'VOTE_CAST',
      'POLL_CLOSED',
      'EXPENSE_ADDED',
      'EXPENSE_SETTLED',
      'TASK_CREATED',
      'TASK_COMPLETED'
    ],
    required: true
  },
  details: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

tripActivitySchema.index({ tripId: 1, createdAt: -1 });

const { wrapModel } = require('./localStore');
const TripActivityModel = mongoose.model('TripActivity', tripActivitySchema);
module.exports = wrapModel(TripActivityModel, 'tripactivities');

