const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const DocumentChunk = require('../models/DocumentChunk');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const { extractPdf } = require('../services/documents/pdfExtractor');
const { extractDocx } = require('../services/documents/docxExtractor');
const { extractText } = require('../services/documents/textExtractor');
const documentChunker = require('../services/documents/documentChunker');
const documentRetriever = require('../services/documents/documentRetriever');
const knowledgeAgent = require('../services/ai/knowledgeAgent');

/**
 * 1. Upload Document & Extract Intelligence
 */
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

    // Split text into indexed chunks
    const chunksData = documentChunker.chunkText(extractedText);

    // Initial AI summarization
    const summaryResult = await knowledgeAgent.summarizeDocument({
      documentName: file.originalname,
      textSample: extractedText,
      totalCharacters: extractedText.length
    });

    const docData = summaryResult.data;

    // Pre-generate study materials, roadmap, and knowledge graph
    const [studyRes, roadmapRes, graphRes, researchRes] = await Promise.all([
      knowledgeAgent.generateStudyMaterials({
        document: { originalName: file.originalname },
        textSample: extractedText
      }),
      knowledgeAgent.extractProjectRoadmap({
        document: { originalName: file.originalname },
        textSample: extractedText
      }),
      knowledgeAgent.generateKnowledgeGraph({
        document: { originalName: file.originalname, importantEntities: docData.importantEntities },
        textSample: extractedText
      }),
      knowledgeAgent.analyzeResearchPaper({
        document: { originalName: file.originalname },
        textSample: extractedText
      })
    ]);

    // Create Document in Database
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
      actionItems: docData.actionItems || [],
      chapterSummaries: docData.chapterSummaries || [],
      studyMaterials: studyRes.data || {},
      researchAnalysis: researchRes.data || {},
      knowledgeGraph: graphRes.data || { nodes: [], edges: [] },
      extractedProjectRoadmap: roadmapRes.data || { projectName: file.originalname, milestones: [] }
    });

    // Store chunks with references
    if (chunksData.length > 0) {
      const chunkDocs = chunksData.map(c => ({
        documentId: document._id,
        ownerId: userId,
        chunkIndex: c.chunkIndex,
        pageNumber: c.pageNumber || (totalPages ? Math.min(totalPages, Math.floor(c.chunkIndex / 3) + 1) : null),
        content: c.content,
        charCount: c.charCount,
        keywords: c.keywords
      }));
      await DocumentChunk.insertMany(chunkDocs);
    }

    await Notification.create({
      ownerId: userId,
      title: 'Knowledge Hub Indexed',
      message: `"${file.originalname}" processed into ${chunksData.length} chunks with AI summaries, study aids, and action items.`,
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

/**
 * 2. Get All Documents for User
 */
exports.getAll = async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = { ownerId: req.user._id };

    if (search && search.trim()) {
      query.$or = [
        { originalName: { $regex: search.trim(), $options: 'i' } },
        { shortSummary: { $regex: search.trim(), $options: 'i' } },
        { importantEntities: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const documents = await Document.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: documents.length, documents });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Get Single Document with details & sample chunks
 */
exports.getOne = async (req, res, next) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found or unauthorized.' });
    }

    const chunks = await DocumentChunk.find({ documentId: document._id }).sort({ chunkIndex: 1 }).limit(30);

    res.status(200).json({ success: true, document, sampleChunks: chunks });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Re-summarize Document
 */
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
    document.chapterSummaries = data.chapterSummaries || document.chapterSummaries;
    await document.save();

    res.status(200).json({ success: true, summary: data, isDemoOutput: summaryResult.isDemoOutput });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Single Document Evidence-Based Q&A
 */
exports.ask = async (req, res, next) => {
  try {
    const { question, history = [] } = req.body;
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
      question,
      conversationHistory: history
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

/**
 * 6. Multi-Document Cross-Referencing Q&A
 */
exports.multiAsk = async (req, res, next) => {
  try {
    const { documentIds, question } = req.body;
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one document ID is required.' });
    }
    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'Question is required.' });
    }

    const documents = await Document.find({
      _id: { $in: documentIds },
      ownerId: req.user._id
    });

    if (documents.length === 0) {
      return res.status(404).json({ success: false, message: 'No accessible documents found.' });
    }

    // Gather chunks from each document
    let allChunks = [];
    for (const doc of documents) {
      const docChunks = await documentRetriever.retrieveChunks(doc._id, question, 2);
      allChunks.push(...docChunks.map(c => ({
        ...c,
        documentId: doc._id,
        documentName: doc.originalName
      })));
    }

    const answerResult = await knowledgeAgent.answerMultiDocumentQuestion({
      documents,
      chunks: allChunks,
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

/**
 * 7. Multi-Document Comparison: Common topics, differences, conflicts, synthesis
 */
exports.compare = async (req, res, next) => {
  try {
    const { documentIds } = req.body;
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length < 2) {
      return res.status(400).json({ success: false, message: 'Please select at least 2 documents to compare.' });
    }

    const documents = await Document.find({
      _id: { $in: documentIds },
      ownerId: req.user._id
    });

    if (documents.length < 2) {
      return res.status(404).json({ success: false, message: 'Could not find at least 2 valid documents to compare.' });
    }

    const comparisonResult = await knowledgeAgent.compareDocuments({ documents });

    res.status(200).json({
      success: true,
      comparison: comparisonResult.data,
      documents: documents.map(d => ({ _id: d._id, originalName: d.originalName })),
      isDemoOutput: comparisonResult.isDemoOutput,
      provider: comparisonResult.provider
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 8. AI Study Assistant: Generate MCQs, Flashcards, Notes, Revision Plan
 */
exports.generateStudy = async (req, res, next) => {
  try {
    const { type = 'all' } = req.body;
    const document = await Document.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const chunks = await DocumentChunk.find({ documentId: document._id }).sort({ chunkIndex: 1 }).limit(10);
    const combinedText = chunks.map(c => c.content).join('\n\n');

    const studyResult = await knowledgeAgent.generateStudyMaterials({
      document,
      textSample: combinedText,
      type
    });

    document.studyMaterials = studyResult.data;
    await document.save();

    res.status(200).json({
      success: true,
      studyMaterials: studyResult.data,
      isDemoOutput: studyResult.isDemoOutput,
      provider: studyResult.provider
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 9. AI Study Assistant: Evaluate User Answer
 */
exports.evaluateAnswer = async (req, res, next) => {
  try {
    const { question, modelAnswer, userAnswer } = req.body;
    if (!question || !userAnswer) {
      return res.status(400).json({ success: false, message: 'Question and student answer are required.' });
    }

    const evalResult = await knowledgeAgent.evaluateAnswer({
      question,
      modelAnswer: modelAnswer || '',
      userAnswer
    });

    res.status(200).json({
      success: true,
      evaluation: evalResult
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 10. Research Paper Deep Analysis
 */
exports.getResearchAnalysis = async (req, res, next) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    if (document.researchAnalysis && document.researchAnalysis.abstractSummary && req.query.refresh !== 'true') {
      return res.status(200).json({ success: true, researchAnalysis: document.researchAnalysis });
    }

    const chunks = await DocumentChunk.find({ documentId: document._id }).sort({ chunkIndex: 1 }).limit(10);
    const combinedText = chunks.map(c => c.content).join('\n\n');

    const analysisRes = await knowledgeAgent.analyzeResearchPaper({
      document,
      textSample: combinedText
    });

    document.researchAnalysis = analysisRes.data;
    await document.save();

    res.status(200).json({
      success: true,
      researchAnalysis: analysisRes.data,
      isDemoOutput: analysisRes.isDemoOutput
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 11. Knowledge Graph Extraction
 */
exports.getKnowledgeGraph = async (req, res, next) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    if (document.knowledgeGraph && document.knowledgeGraph.nodes && document.knowledgeGraph.nodes.length > 0 && req.query.refresh !== 'true') {
      return res.status(200).json({ success: true, knowledgeGraph: document.knowledgeGraph });
    }

    const chunks = await DocumentChunk.find({ documentId: document._id }).sort({ chunkIndex: 1 }).limit(10);
    const combinedText = chunks.map(c => c.content).join('\n\n');

    const graphRes = await knowledgeAgent.generateKnowledgeGraph({
      document,
      textSample: combinedText
    });

    document.knowledgeGraph = graphRes.data;
    await document.save();

    res.status(200).json({
      success: true,
      knowledgeGraph: graphRes.data,
      isDemoOutput: graphRes.isDemoOutput
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 12. Knowledge-to-Action: Convert Single Action Item to Task
 */
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
      status: 'To Do',
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

/**
 * 13. Knowledge-to-Action: Convert ALL Action Items to Tasks
 */
exports.convertAllActions = async (req, res, next) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const createdTasks = [];
    for (const item of document.actionItems) {
      if (!item.convertedToTask) {
        const task = await Task.create({
          ownerId: req.user._id,
          title: item.task,
          description: `Extracted from document: "${document.originalName}"`,
          status: 'To Do',
          priority: item.priority || 'Medium',
          originType: 'DOCUMENT',
          originId: document._id,
          originModel: 'Document',
          originLabel: document.originalName,
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        });
        item.convertedToTask = true;
        createdTasks.push(task);
      }
    }

    await document.save();

    res.status(201).json({
      success: true,
      message: `Successfully converted ${createdTasks.length} action items into Central Tasks.`,
      tasks: createdTasks
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 14. Knowledge-to-Action: Convert Extracted Roadmap into Real Project + Tasks
 */
exports.convertProject = async (req, res, next) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const roadmap = document.extractedProjectRoadmap || {};
    const projectName = req.body.projectName || roadmap.projectName || `${document.originalName} Project`;
    const description = req.body.description || roadmap.description || `Derived from "${document.originalName}"`;
    const category = req.body.category || roadmap.category || 'Development';
    const milestones = req.body.milestones || roadmap.milestones || [];

    // Create the Project
    const project = await Project.create({
      ownerId: req.user._id,
      name: projectName,
      description,
      category,
      priority: 'High',
      status: 'Planning',
      startDate: new Date(),
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      objectives: [`Execute specifications outlined in ${document.originalName}`],
      milestones: milestones.map((m, idx) => ({
        title: m.title || `Milestone ${idx + 1}`,
        description: m.description || '',
        targetDay: (idx + 1) * 3,
        completed: false
      }))
    });

    // Create associated tasks linked to the project
    const createdTasks = [];
    for (const milestone of milestones) {
      if (Array.isArray(milestone.tasks)) {
        for (const taskTitle of milestone.tasks) {
          const task = await Task.create({
            ownerId: req.user._id,
            title: taskTitle,
            description: `Part of ${milestone.title} from document: ${document.originalName}`,
            priority: 'High',
            status: 'To Do',
            originType: 'PROJECT',
            originId: project._id,
            originModel: 'Project',
            originLabel: project.name,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          });
          createdTasks.push(task);
        }
      }
    }

    // Mark document roadmap as converted
    if (document.extractedProjectRoadmap) {
      document.extractedProjectRoadmap.convertedToProject = true;
      await document.save();
    }

    await Notification.create({
      ownerId: req.user._id,
      title: 'Project Created from Document',
      message: `Created project "${project.name}" with ${createdTasks.length} linked tasks.`,
      type: 'PROJECT',
      link: `/projects/${project._id}`
    });

    res.status(201).json({
      success: true,
      message: `Successfully created project "${project.name}" with ${createdTasks.length} tasks!`,
      project,
      tasks: createdTasks
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 15. Global Document Search across all user files and chunks
 */
exports.searchAll = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, message: 'Search query is required.' });
    }

    const query = q.trim();
    const userId = req.user._id;

    // Search matching chunks
    const matchingChunks = await DocumentChunk.find({
      ownerId: userId,
      $or: [
        { content: { $regex: query, $options: 'i' } },
        { keywords: { $regex: query, $options: 'i' } }
      ]
    }).limit(20);

    // Get matching documents
    const docIds = [...new Set(matchingChunks.map(c => c.documentId.toString()))];
    const docs = await Document.find({ _id: { $in: docIds } });
    const docMap = new Map(docs.map(d => [d._id.toString(), d]));

    const results = matchingChunks.map(chunk => ({
      chunkIndex: chunk.chunkIndex,
      pageNumber: chunk.pageNumber,
      content: chunk.content.slice(0, 240) + '...',
      documentId: chunk.documentId,
      documentName: docMap.get(chunk.documentId.toString())?.originalName || 'Document'
    }));

    res.status(200).json({
      success: true,
      query,
      totalResults: results.length,
      results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 16. Delete Document & All Chunks
 */
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
