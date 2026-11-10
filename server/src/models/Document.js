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
  }],
  chapterSummaries: [{
    title: { type: String, required: true },
    summary: { type: String, required: true },
    keyPoints: [{ type: String }]
  }],
  studyMaterials: {
    mcqs: [{
      question: { type: String, required: true },
      options: [{ type: String, required: true }],
      answer: { type: Number, required: true },
      explanation: { type: String, default: '' }
    }],
    flashcards: [{
      front: { type: String, required: true },
      back: { type: String, required: true },
      category: { type: String, default: 'General' }
    }],
    descriptiveQuestions: [{
      question: { type: String, required: true },
      modelAnswer: { type: String, default: '' },
      points: [{ type: String }]
    }],
    studyNotes: [{
      topic: { type: String, required: true },
      notes: { type: String, required: true },
      keyTakeaways: [{ type: String }]
    }],
    revisionPlan: [{
      day: { type: Number, required: true },
      focusTopic: { type: String, required: true },
      tasks: [{ type: String }],
      durationMinutes: { type: Number, default: 45 }
    }]
  },
  researchAnalysis: {
    abstractSummary: { type: String, default: '' },
    methodology: { type: String, default: '' },
    keyResults: { type: String, default: '' },
    criticalEvaluation: { type: String, default: '' },
    limitations: { type: String, default: '' },
    practicalApplications: [{ type: String }]
  },
  knowledgeGraph: {
    nodes: [{
      id: { type: String, required: true },
      label: { type: String, required: true },
      type: { type: String, default: 'concept' }
    }],
    edges: [{
      from: { type: String, required: true },
      to: { type: String, required: true },
      relationship: { type: String, default: 'relates_to' }
    }]
  },
  extractedProjectRoadmap: {
    projectName: { type: String, default: '' },
    description: { type: String, default: '' },
    category: { type: String, default: 'Development' },
    milestones: [{
      title: { type: String, required: true },
      description: { type: String, default: '' },
      tasks: [{ type: String }]
    }],
    convertedToProject: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

documentSchema.index({ ownerId: 1, createdAt: -1 });

const { wrapModel } = require('./localStore');
const DocumentModel = mongoose.model('Document', documentSchema);
module.exports = wrapModel(DocumentModel, 'documents');

