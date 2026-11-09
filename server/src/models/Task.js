const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  status: {
    type: String,
    enum: ['To Do', 'In Progress', 'Completed'],
    default: 'To Do',
    index: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium',
    index: true
  },
  dueDate: {
    type: Date,
    default: null
  },
  estimatedDuration: {
    type: String,
    default: '1 hour'
  },
  originType: {
    type: String,
    enum: ['PROJECT', 'TRIP', 'DOCUMENT', 'MANUAL', 'AI_ASSISTANT'],
    default: 'MANUAL',
    index: true
  },
  originId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    refPath: 'originModel'
  },
  originModel: {
    type: String,
    enum: ['Project', 'Trip', 'Document', null],
    default: null
  },
  originLabel: {
    type: String,
    default: ''
  },
  tags: [{
    type: String,
    trim: true
  }],
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

taskSchema.index({ ownerId: 1, status: 1, dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema);
