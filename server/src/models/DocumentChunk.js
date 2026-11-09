const mongoose = require('mongoose');

const documentChunkSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  chunkIndex: {
    type: Number,
    required: true
  },
  pageNumber: {
    type: Number,
    default: null
  },
  content: {
    type: String,
    required: true
  },
  charCount: {
    type: Number,
    required: true
  },
  keywords: [{
    type: String
  }]
}, {
  timestamps: true
});

documentChunkSchema.index({ documentId: 1, chunkIndex: 1 });
documentChunkSchema.index({ ownerId: 1, content: 'text' });

const { wrapModel } = require('./localStore');
const DocumentChunkModel = mongoose.model('DocumentChunk', documentChunkSchema);
module.exports = wrapModel(DocumentChunkModel, 'documentchunks');

