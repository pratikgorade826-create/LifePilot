const mongoose = require('mongoose');

const tripTaskSchema = new mongoose.Schema({
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true
  },
  category: {
    type: String,
    enum: ['Booking', 'Preparation', 'Research', 'Packing', 'General'],
    default: 'General'
  },
  assignedTo: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    userName: {
      type: String,
      default: 'Unassigned'
    }
  },
  deadline: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

tripTaskSchema.index({ tripId: 1, status: 1 });

const { wrapModel } = require('./localStore');
const TripTaskModel = mongoose.model('TripTask', tripTaskSchema);
module.exports = wrapModel(TripTaskModel, 'triptasks');

