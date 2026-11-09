const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['pdf', 'docx', 'txt'],
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  totalCharacters: {
    type: Number,
    default: 0
  },
  totalChunks: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['processing', 'ready', 'failed'],
    default: 'processing'
  },
  processingError: {
    type: String,
    default: null
  },
  shortSummary: {
    type: String,
    default: ''
  },
  detailedSummary: {
    type: String,
    default: ''
  },
  importantPoints: [{
    type: String
  }],
  keyFindings: [{
    type: String
  }],
  importantDates: [{
    date: { type: String },
    event: { type: String }
  }],
  importantEntities: [{
    type: String
  }],
  actionItems: [{
    task: { type: String, required: true },
    priority: { type: String, default: 'Medium' },
    deadline: { type: String, default: '' },
    convertedToTask: { type: Boolean, default: false }
  }]
}, {
  timestamps: true
});

documentSchema.index({ ownerId: 1, createdAt: -1 });

module.exports = mongoose.model('Document', documentSchema);
