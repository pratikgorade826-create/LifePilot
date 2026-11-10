const mongoose = require('mongoose');

const participantSplitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  userName: {
    type: String,
    required: true
  },
  shareAmount: {
    type: Number,
    required: true,
    min: 0
  },
  isSettled: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const tripExpenseSchema = new mongoose.Schema({
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Expense description is required'],
    trim: true
  },
  category: {
    type: String,
    enum: [
      'Transportation',
      'Accommodation',
      'Food',
      'Activities',
      'Shopping',
      'Local Transport',
      'Emergency',
      'Miscellaneous'
    ],
    default: 'Food'
  },
  amount: {
    type: Number,
    required: [true, 'Expense amount is required'],
    min: [0, 'Amount must be non-negative']
  },
  paidBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    userName: {
      type: String,
      required: true,
      default: 'Alex Mercer'
    }
  },
  splitType: {
    type: String,
    enum: ['equal', 'custom'],
    default: 'equal'
  },
  participants: [participantSplitSchema],
  expenseDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

tripExpenseSchema.index({ tripId: 1, expenseDate: -1 });

const { wrapModel } = require('./localStore');
const TripExpenseModel = mongoose.model('TripExpense', tripExpenseSchema);
module.exports = wrapModel(TripExpenseModel, 'tripexpenses');

