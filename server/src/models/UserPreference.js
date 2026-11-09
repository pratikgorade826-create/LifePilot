const mongoose = require('mongoose');

const userPreferenceSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  defaultCurrency: {
    type: String,
    default: 'INR'
  },
  travelBudgetStyle: {
    type: String,
    enum: ['Budget', 'Standard', 'Luxury'],
    default: 'Standard'
  },
  defaultTravelInterests: [{
    type: String
  }],
  aiProviderPreference: {
    type: String,
    enum: ['bharatcode', 'gemini', 'auto', 'demo'],
    default: 'auto'
  },
  notificationsEnabled: {
    type: Boolean,
    default: true
  },
  theme: {
    type: String,
    enum: ['dark', 'light'],
    default: 'dark'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('UserPreference', userPreferenceSchema);
