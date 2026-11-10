const mongoose = require('mongoose');

const scenarioSchema = new mongoose.Schema({
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true,
    index: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Scenario name is required'],
    trim: true
  },
  scenarioQuery: {
    type: String,
    required: true,
    trim: true
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  originalBudget: {
    type: Number,
    required: true
  },
  proposedBudget: {
    type: Number,
    required: true
  },
  costDifference: {
    type: Number,
    default: 0
  },
  costPerPerson: {
    type: Number,
    default: 0
  },
  originalDuration: {
    type: Number,
    required: true
  },
  proposedDuration: {
    type: Number,
    required: true
  },
  transportChanges: {
    type: String,
    default: ''
  },
  addedActivities: [{
    type: String
  }],
  removedActivities: [{
    type: String
  }],
  itinerary: [{
    day: Number,
    title: String,
    theme: String,
    activities: [{
      time: String,
      title: String,
      description: String,
      location: String,
      estimatedCost: Number
    }],
    meals: {
      breakfast: String,
      lunch: String,
      dinner: String
    },
    stay: String
  }],
  budgetBreakdown: {
    transportation: { type: Number, default: 0 },
    accommodation: { type: Number, default: 0 },
    food: { type: Number, default: 0 },
    activities: { type: Number, default: 0 },
    shopping: { type: Number, default: 0 },
    localTransport: { type: Number, default: 0 },
    emergency: { type: Number, default: 0 },
    miscellaneous: { type: Number, default: 0 },
    totalEstimated: { type: Number, default: 0 }
  },
  warnings: [{
    type: String
  }],
  advantages: [{
    type: String
  }],
  disadvantages: [{
    type: String
  }],
  feasibility: {
    type: String,
    enum: ['highly_feasible', 'reasonable', 'challenging', 'unrealistic'],
    default: 'reasonable'
  },
  feasibilityScore: {
    type: Number,
    default: 85
  },
  isApplied: {
    type: Boolean,
    default: false
  },
  appliedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

scenarioSchema.index({ tripId: 1, createdAt: -1 });

const { wrapModel } = require('./localStore');
const ScenarioModel = mongoose.model('TripScenario', scenarioSchema);
module.exports = wrapModel(ScenarioModel, 'tripscenarios');

