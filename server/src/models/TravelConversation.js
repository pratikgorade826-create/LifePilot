const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  actionPreview: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const travelConversationSchema = new mongoose.Schema({
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  messages: [chatMessageSchema]
}, {
  timestamps: true
});

travelConversationSchema.index({ tripId: 1, userId: 1 });

const { wrapModel } = require('./localStore');
const TravelConversationModel = mongoose.model('TravelConversation', travelConversationSchema);
module.exports = wrapModel(TravelConversationModel, 'travelconversations');

