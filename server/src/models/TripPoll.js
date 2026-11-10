const mongoose = require('mongoose');

const voteEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    default: 'Traveler'
  },
  votedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const pollOptionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  votes: [voteEntrySchema]
});

const tripPollSchema = new mongoose.Schema({
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true,
    index: true
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  creatorName: {
    type: String,
    default: 'Trip Member'
  },
  title: {
    type: String,
    required: [true, 'Poll question or title is required'],
    trim: true
  },
  category: {
    type: String,
    enum: ['hotel', 'restaurant', 'attraction', 'transport', 'activity', 'dates', 'general'],
    default: 'general'
  },
  options: [pollOptionSchema],
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  },
  winner: {
    type: String,
    default: ''
  },
  closedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

tripPollSchema.index({ tripId: 1, status: 1 });

const { wrapModel } = require('./localStore');
const PollModel = mongoose.model('TripPoll', tripPollSchema);
module.exports = wrapModel(PollModel, 'trippolls');

