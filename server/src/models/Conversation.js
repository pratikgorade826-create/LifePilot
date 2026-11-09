const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    default: 'New Conversation',
    trim: true
  },
  intent: {
    type: String,
    enum: ['TRAVEL', 'PROJECT', 'KNOWLEDGE', 'TASK', 'GENERAL'],
    default: 'GENERAL'
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

conversationSchema.index({ ownerId: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
