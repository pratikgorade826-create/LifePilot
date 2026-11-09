const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sender: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  intent: {
    type: String,
    enum: ['TRAVEL', 'PROJECT', 'KNOWLEDGE', 'TASK', 'GENERAL'],
    default: 'GENERAL'
  },
  structuredData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  actionSuggested: {
    type: String,
    enum: ['SAVE_TRIP', 'CREATE_PROJECT', 'CREATE_TASKS', 'SUMMARIZE_DOC', null],
    default: null
  },
  actionStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'saved'],
    default: 'pending'
  },
  isDemoOutput: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

messageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
