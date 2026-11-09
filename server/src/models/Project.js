const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  targetDay: { type: Number, default: 1 },
  completed: { type: Boolean, default: false }
}, { _id: true });

const projectSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  category: {
    type: String,
    enum: ['Development', 'Design', 'Marketing', 'Academics', 'Personal', 'Business', 'Other'],
    default: 'Development'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Planning', 'In Progress', 'Completed', 'On Hold'],
    default: 'Planning'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  deadline: {
    type: Date,
    required: true
  },
  availableWorkingHours: {
    type: Number,
    default: 20
  },
  objectives: [{
    type: String
  }],
  milestones: [milestoneSchema],
  completionChecklist: [{
    item: { type: String, required: true },
    completed: { type: Boolean, default: false }
  }],
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  isAiGenerated: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

projectSchema.index({ ownerId: 1, deadline: 1 });

module.exports = mongoose.model('Project', projectSchema);
