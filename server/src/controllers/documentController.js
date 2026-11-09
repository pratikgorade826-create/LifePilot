const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const DocumentChunk = require('../models/DocumentChunk');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const { extractPdf } = require('../services/documents/pdfExtractor');
const { extractDocx } = require('../services/documents/docxExtractor');
const { extractText } = require('../services/documents/textExtractor');
const documentChunker = require('../services/documents/documentChunker');
const documentRetriever = require('../services/documents/documentRetriever');
const knowledgeAgent = require('../services/ai/knowledgeAgent');

exports.upload = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file (PDF, DOCX, or TXT).' });
    }

    const userId = req.user._id;
    const file = req.file;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');

    let extractedText = '';
    let totalPages = null;

    try {
      if (ext === 'pdf') {
        const result = await extractPdf(file.path);
        extractedText = result.text;
        totalPages = result.totalPages;
      } else if (ext === 'docx') {
        const result = await extractDocx(file.path);
        extractedText = result.text;
      } else {
        const result = await extractText(file.path);
        extractedText = result.text;
      }
    } catch (parseErr) {
      console.error('[Document Parse Error]', parseErr);
      return res.status(422).json({
        success: false,
        message: `Failed to extract text from ${file.originalname}: ${parseErr.message}`
      });
    }

    // Split text into chunks
    const chunksData = documentChunker.chunkText(extractedText);

    // Initial AI summarization
    const summaryResult = await knowledgeAgent.summarizeDocument({
      documentName: file.originalname,
      textSample: extractedText,
      totalCharacters: extractedText.length
    });

    const docData = summaryResult.data;

    // Create Document in MongoDB
    const document = await Document.create({
      ownerId: userId,
      originalName: file.originalname,
      fileName: file.filename,
      fileType: ext,
      fileSize: file.size,
      filePath: file.path,
      totalCharacters: extractedText.length,
      totalChunks: chunksData.length,
      status: 'ready',
      shortSummary: docData.shortSummary || '',
      detailedSummary: docData.detailedSummary || '',
      importantPoints: docData.importantPoints || [],
      keyFindings: docData.keyFindings || [],
      importantDates: docData.importantDates || [],
      importantEntities: docData.importantEntities || [],
      actionItems: docData.actionItems || []
    });

    // Store chunks in MongoDB
    if (chunksData.length > 0) {
      const chunkDocs = chunksData.map(c => ({
        documentId: document._id,
        ownerId: userId,
        chunkIndex: c.chunkIndex,
        pageNumber: c.pageNumber,
        content: c.content,
        charCount: c.charCount,
        keywords: c.keywords
      }));
      await DocumentChunk.insertMany(chunkDocs);
    }

    await Notification.create({
      ownerId: userId,
      title: 'Document Analyzed',
      message: `"${file.originalname}" processed into ${chunksData.length} chunks with AI summary.`,
      type: 'DOCUMENT',
      link: `/documents/${document._id}`
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded and analyzed successfully.',
      document,
      isDemoOutput: summaryResult.isDemoOutput,
      provider: summaryResult.provider
    });
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const documents = await Document.find({ ownerId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: documents.length, documents });
  } catch (error) {
    next(error);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found or unauthorized.' });
    }

    const chunks = await DocumentChunk.find({ documentId: document._id }).sort({ chunkIndex: 1 }).limit(20);

    res.status(200).json({ success: true, document, sampleChunks: chunks });
  } catch (error) {
    next(error);
  }
};

exports.summarize = async (req, res, next) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const chunks = await DocumentChunk.find({ documentId: document._id }).sort({ chunkIndex: 1 }).limit(10);
    const combinedText = chunks.map(c => c.content).join('\n\n');

    const summaryResult = await knowledgeAgent.summarizeDocument({
      documentName: document.originalName,
      textSample: combinedText,
      totalCharacters: document.totalCharacters
    });

    const data = summaryResult.data;
    document.shortSummary = data.shortSummary || document.shortSummary;
    document.detailedSummary = data.detailedSummary || document.detailedSummary;
    document.importantPoints = data.importantPoints || document.importantPoints;
    document.keyFindings = data.keyFindings || document.keyFindings;
    document.importantDates = data.importantDates || document.importantDates;
    document.importantEntities = data.importantEntities || document.importantEntities;
    document.actionItems = data.actionItems || document.actionItems;
    await document.save();

    res.status(200).json({ success: true, summary: data, isDemoOutput: summaryResult.isDemoOutput });
  } catch (error) {
    next(error);
  }
};

exports.ask = async (req, res, next) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'Question is required.' });
    }

    const document = await Document.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    // Retrieve most relevant chunks for the question
    const chunks = await documentRetriever.retrieveChunks(document._id, question, 4);

    const answerResult = await knowledgeAgent.answerDocumentQuestion({
      document,
      chunks,
      question
    });

    res.status(200).json({
      success: true,
      question,
      answer: answerResult.answer,
      sources: answerResult.sources,
      isDemoOutput: answerResult.isDemoOutput,
      provider: answerResult.provider
    });
  } catch (error) {
    next(error);
  }
};

exports.convertAction = async (req, res, next) => {
  try {
    const { actionIndex } = req.body;
    const document = await Document.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const item = document.actionItems[actionIndex];
    if (!item) {
      return res.status(404).json({ success: false, message: 'Action item index not found.' });
    }

    const task = await Task.create({
      ownerId: req.user._id,
      title: item.task,
      description: `Extracted from document: "${document.originalName}"`,
      priority: item.priority || 'Medium',
      originType: 'DOCUMENT',
      originId: document._id,
      originModel: 'Document',
      originLabel: document.originalName,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    });

    item.convertedToTask = true;
    await document.save();

    res.status(201).json({
      success: true,
      message: `Action item converted to Task: "${task.title}"`,
      task
    });
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const document = await Document.findOneAndDelete({ _id: req.params.id, ownerId: req.user._id });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found or unauthorized.' });
    }

    // Delete chunks
    await DocumentChunk.deleteMany({ documentId: req.params.id });

    // Safely delete file if exists
    if (fs.existsSync(document.filePath)) {
      try {
        fs.unlinkSync(document.filePath);
      } catch (e) {
        // file remove error ignored
      }
    }

    res.status(200).json({ success: true, message: 'Document deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

