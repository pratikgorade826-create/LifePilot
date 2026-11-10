const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['Transportation', 'Accommodation', 'Food', 'Activities', 'Miscellaneous'],
    required: [true, 'Expense category is required']
  },
  amount: {
    type: Number,
    required: [true, 'Expense amount is required'],
    min: [0, 'Expense amount must be non-negative']
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  expenseDate: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const dayScheduleSchema = new mongoose.Schema({
  day: { type: Number, required: true },
  title: { type: String, default: '' },
  theme: { type: String, default: '' },
  activities: [{
    time: { type: String, default: 'Morning' },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    location: { type: String, default: '' },
    estimatedCost: { type: Number, default: 0 }
  }],
  meals: {
    breakfast: { type: String, default: '' },
    lunch: { type: String, default: '' },
    dinner: { type: String, default: '' }
  },
  stay: { type: String, default: '' }
}, { _id: false });

const tripSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Trip name is required'],
    trim: true
  },
  startingLocation: {
    type: String,
    required: true,
    trim: true
  },
  destination: {
    type: String,
    required: [true, 'Destination is required'],
    trim: true
  },
  departureDate: {
    type: Date,
    required: true
  },
  returnDate: {
    type: Date,
    required: true
  },
  durationDays: {
    type: Number,
    default: 5
  },
  travelersCount: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  totalBudget: {
    type: Number,
    required: true,
    min: 0
  },
  budgetPerPerson: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  travelStyle: {
    type: String,
    enum: ['Budget', 'Standard', 'Luxury'],
    default: 'Standard'
  },
  interests: [{
    type: String,
    enum: ['Adventure', 'Nature', 'Beaches', 'Food', 'Culture', 'Shopping', 'Relaxation', 'Nightlife', 'Historical']
  }],
  additionalPreferences: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['draft', 'planned', 'ongoing', 'completed', 'cancelled'],
    default: 'planned'
  },
  overview: {
    type: String,
    default: ''
  },
  itinerary: [dayScheduleSchema],
  budgetBreakdown: {
    transportation: { type: Number, default: 0 },
    accommodation: { type: Number, default: 0 },
    food: { type: Number, default: 0 },
    activities: { type: Number, default: 0 },
    miscellaneous: { type: Number, default: 0 },
    totalEstimated: { type: Number, default: 0 },
    isEstimateNotice: { type: String, default: 'Budgets are approximate estimates based on current standard travel patterns and not real-time live bookings.' }
  },
  packingChecklist: [{
    category: { type: String, default: 'General' },
    item: { type: String, required: true },
    checked: { type: Boolean, default: false }
  }],
  preparationChecklist: [{
    task: { type: String, required: true },
    dueDate: { type: Date },
    checked: { type: Boolean, default: false }
  }],
  actualExpenses: [expenseSchema],
  isAiGenerated: {
    type: Boolean,
    default: true
  },
  feasibilityScore: {
    type: Number,
    default: null
  },
  feasibilityReport: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: true
});

tripSchema.index({ ownerId: 1, departureDate: 1 });

const { wrapModel } = require('./localStore');
const TripModel = mongoose.model('Trip', tripSchema);
module.exports = wrapModel(TripModel, 'trips');

