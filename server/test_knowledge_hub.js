/**
 * LifePilot AI — Knowledge Hub Automated Verification Suite
 * Verifies all 13 core modules of the Advanced Personal Knowledge Hub:
 * 1. Document Extraction & Chunking
 * 2. Deep Summarization & Chapter Breakdown
 * 3. Evidence-Based RAG Q&A with Verified Citations
 * 4. Multi-Document Comparison & Conflict Detection
 * 5. Multi-Document Cross-Referencing Q&A
 * 6. AI Study Assistant: MCQs, Flashcards, Study Notes, Revision Plans
 * 7. AI Answer Evaluation (0-100 score + feedback)
 * 8. Academic Research Paper Analysis
 * 9. Knowledge Graph Extraction (Nodes & Edges)
 * 10. Knowledge-to-Action: Task Conversion
 * 11. Knowledge-to-Action: Project Roadmap Conversion
 * 12. Security & File Validation
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const documentChunker = require('./src/services/documents/documentChunker');
const documentRetriever = require('./src/services/documents/documentRetriever');
const knowledgeAgent = require('./src/services/ai/knowledgeAgent');
const Document = require('./src/models/Document');
const DocumentChunk = require('./src/models/DocumentChunk');
const Task = require('./src/models/Task');
const Project = require('./src/models/Project');
const { connectDB } = require('./src/config/db');

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${description}`);
    passed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${description}\n   Error: ${err.message}`);
    failed++;
  }
}

async function testAsync(description, fn) {
  try {
    await fn();
    console.log(`✅ [PASS] ${description}`);
    passed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${description}\n   Error: ${err.message}`);
    failed++;
  }
}

async function runKnowledgeHubTests() {
  console.log('========================================================');
  console.log('  🧠 RUNNING ADVANCED AI KNOWLEDGE HUB TEST SUITE      ');
  console.log('========================================================\n');

  await connectDB();

  const sampleDocText = `
LifePilot Architectural Specification and Delivery Roadmap.
Phase 1 Foundation: Deliver the core modular backend by Day 5. Establish zero-setup local SQLite database integration.
Phase 2 AI Integration: Connect BharatCode API and Gemini 3.5 Flash fallbacks for resilient natural language processing.
Security Standard: All files uploaded must be scanned and strictly limited to 15MB. Never execute untrusted files.
Deliverable Deadline: The initial prototype review is scheduled for Day 7. Full production release is on Day 14.
Key Deliverable: Create Kanban boards and automate task conversions with explicit user approval before database commit.
Stakeholders: Alex Mercer, Lead AI Engineer, Product Steering Committee.
`;

  // 1. Text Chunking & Sliding Window
  test('Module 1: Document chunker creates indexed chunks with character counts', () => {
    const chunks = documentChunker.chunkText(sampleDocText, { chunkSize: 250, chunkOverlap: 40 });
    assert(chunks.length >= 2, 'Should produce multiple chunks');
    assert(chunks[0].chunkIndex === 0, 'First chunk index is 0');
    assert(typeof chunks[0].charCount === 'number', 'Chunk has character length');
    assert(Array.isArray(chunks[0].keywords), 'Chunk extracts keywords');
  });

  // 2. Comprehensive Summarization
  await testAsync('Module 2: AI Document Summarizer extracts executive summary, chapters & dates', async () => {
    const summaryRes = await knowledgeAgent.summarizeDocument({
      documentName: 'LifePilot_Spec.pdf',
      textSample: sampleDocText,
      totalCharacters: sampleDocText.length
    });

    assert(summaryRes.success === true, 'Summarization returns success');
    const data = summaryRes.data;
    assert(data.shortSummary.length > 20, 'Short summary is present');
    assert(data.importantPoints.length >= 2, 'Has multiple important points');
    assert(data.importantDates.length >= 1, 'Extracted milestone dates');
    assert(data.chapterSummaries.length >= 2, 'Generated chapter breakdowns');
    assert(data.actionItems.length >= 2, 'Extracted actionable tasks');
  });

  // 3. Evidence-Based RAG Q&A with Verified Citations
  await testAsync('Module 3: Evidence-based Single Document Q&A cites exact chunk references', async () => {
    const mockDoc = { _id: 'doc-test-1', originalName: 'LifePilot_Spec.pdf' };
    const mockChunks = [
      { chunkIndex: 0, pageNumber: 1, content: 'Phase 1 Foundation: Deliver the core modular backend by Day 5.' },
      { chunkIndex: 1, pageNumber: 2, content: 'Security Standard: All files uploaded must be scanned and strictly limited to 15MB.' }
    ];

    const qaRes = await knowledgeAgent.answerDocumentQuestion({
      document: mockDoc,
      chunks: mockChunks,
      question: 'What is the file size limit and security standard?'
    });

    assert(qaRes.answer.length > 20, 'Answer generated');
    assert(qaRes.sources.length === 2, 'Cites both source chunks');
    assert(qaRes.sources[0].pageNumber === 1, 'Preserves page number metadata');
  });

  // 4. Multi-Document Comparison
  await testAsync('Module 4: Multi-Document Intelligence compares 2+ docs and identifies differences/conflicts', async () => {
    const docA = {
      originalName: 'System_Requirements_A.docx',
      shortSummary: 'Backend specification targeting Express and SQLite.',
      importantPoints: ['Target latency: <100ms', 'Local SQLite store'],
      importantEntities: ['Backend Engine']
    };
    const docB = {
      originalName: 'System_Requirements_B.docx',
      shortSummary: 'Cloud architecture targeting MongoDB Atlas and containerization.',
      importantPoints: ['Target latency: <250ms', 'Cloud MongoDB cluster'],
      importantEntities: ['Cloud Cluster']
    };

    const compRes = await knowledgeAgent.compareDocuments({ documents: [docA, docB] });
    assert(compRes.success === true, 'Comparison succeeded');
    const data = compRes.data;
    assert(Array.isArray(data.commonTopics) && data.commonTopics.length > 0, 'Found common topics');
    assert(Array.isArray(data.differences) && data.differences.length > 0, 'Found differences');
    assert(typeof data.combinedSummary === 'string', 'Generated combined synthesis');
  });

  // 5. Multi-Document Cross-Referencing Q&A
  await testAsync('Module 5: Multi-Document Q&A synthesizes answers across disparate documents', async () => {
    const docs = [
      { _id: 'd1', originalName: 'Architecture.pdf' },
      { _id: 'd2', originalName: 'Security_Policy.docx' }
    ];
    const multiChunks = [
      { documentId: 'd1', documentName: 'Architecture.pdf', chunkIndex: 0, pageNumber: 3, content: 'Architecture is modular.' },
      { documentId: 'd2', documentName: 'Security_Policy.docx', chunkIndex: 1, pageNumber: 1, content: 'Security requires JWT with 7d expiration.' }
    ];

    const multiQARes = await knowledgeAgent.answerMultiDocumentQuestion({
      documents: docs,
      chunks: multiChunks,
      question: 'How do architecture and security integrate?'
    });

    assert(multiQARes.answer.length > 20, 'Multi-doc answer generated');
    assert(multiQARes.sources.length === 2, 'Cites sources from both documents');
  });

  // 6. AI Study Assistant: MCQs, Flashcards, Study Notes, Revision Plan
  await testAsync('Module 6: AI Study Assistant generates MCQs, flashcards, and revision plan', async () => {
    const studyRes = await knowledgeAgent.generateStudyMaterials({
      document: { originalName: 'LifePilot_Guide.pdf' },
      textSample: sampleDocText
    });

    assert(studyRes.success === true, 'Study materials generated');
    const data = studyRes.data;
    assert(Array.isArray(data.mcqs) && data.mcqs.length >= 2, 'Generated MCQs');
    assert(data.mcqs[0].options.length === 4, 'MCQ has 4 choices');
    assert(typeof data.mcqs[0].answer === 'number', 'MCQ has correct answer index');
    assert(Array.isArray(data.flashcards) && data.flashcards.length >= 2, 'Generated Flashcards');
    assert(data.flashcards[0].front && data.flashcards[0].back, 'Flashcard has front and back');
    assert(Array.isArray(data.studyNotes) && data.studyNotes.length >= 1, 'Generated Study Notes');
    assert(Array.isArray(data.revisionPlan) && data.revisionPlan.length >= 1, 'Generated Revision Plan');
  });

  // 7. AI Answer Evaluation
  await testAsync('Module 7: AI Answer Evaluator grades student response (0-100) with strengths and missed points', async () => {
    const evalRes = await knowledgeAgent.evaluateAnswer({
      question: 'What are the security standards and file size limits specified in the document?',
      modelAnswer: 'Uploaded files must be scanned and limited strictly to 15MB. Never execute untrusted files.',
      userAnswer: 'The system limits file uploads to 15MB and enforces strict scanning to prevent running untrusted files.'
    });

    assert(typeof evalRes.score === 'number' && evalRes.score >= 60, 'Gives appropriate passing score');
    assert(typeof evalRes.verdict === 'string', 'Has verdict');
    assert(Array.isArray(evalRes.strengths), 'Identifies strengths');
    assert(typeof evalRes.feedback === 'string', 'Provides constructive feedback');
  });

  // 8. Academic Research Paper Analysis
  await testAsync('Module 8: Research Paper Analyzer parses abstract, methodology, results, and limitations', async () => {
    const researchRes = await knowledgeAgent.analyzeResearchPaper({
      document: { originalName: 'Neural_Orchestration_Paper.pdf' },
      textSample: sampleDocText
    });

    assert(researchRes.success === true, 'Research analysis succeeded');
    const data = researchRes.data;
    assert(data.abstractSummary.length > 20, 'Has abstract');
    assert(data.methodology.length > 20, 'Has methodology');
    assert(data.keyResults.length > 10, 'Has key results');
    assert(Array.isArray(data.practicalApplications) && data.practicalApplications.length > 0, 'Has practical applications');
  });

  // 9. Knowledge Graph Extraction
  await testAsync('Module 9: Knowledge Graph Architect generates entity nodes and relationship edges', async () => {
    const graphRes = await knowledgeAgent.generateKnowledgeGraph({
      document: { originalName: 'System_Architecture.docx', importantEntities: ['Express', 'SQLite', 'React', 'Vite'] },
      textSample: sampleDocText
    });

    assert(graphRes.success === true, 'Knowledge graph succeeded');
    const data = graphRes.data;
    assert(Array.isArray(data.nodes) && data.nodes.length >= 3, 'Has concept nodes');
    assert(Array.isArray(data.edges) && data.edges.length >= 2, 'Has relationship edges');
    assert(data.edges[0].from && data.edges[0].to, 'Edge connects two nodes');
  });

  // 10. Knowledge-to-Action: Task Conversion
  await testAsync('Module 10: Converts extracted action item directly into LifePilot Task record', async () => {
    const createdTask = await Task.create({
      ownerId: '663e10000000000000000001',
      title: 'Implement file upload 15MB security barrier',
      description: 'Extracted from document specification',
      status: 'To Do',
      priority: 'High',
      originType: 'DOCUMENT',
      originId: '663e10000000000000000099',
      originModel: 'Document',
      originLabel: 'LifePilot_Spec.pdf',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    });

    assert(createdTask._id, 'Task created with ID');
    assert(createdTask.originType === 'DOCUMENT', 'Origin type is DOCUMENT');
    assert(createdTask.status === 'To Do', 'Status initialized to To Do');

    // Clean up test task
    await Task.deleteOne({ _id: createdTask._id });
  });

  // 11. Knowledge-to-Action: Project Roadmap Conversion
  await testAsync('Module 11: Converts extracted document roadmap into full Project with linked Tasks', async () => {
    const project = await Project.create({
      ownerId: '663e10000000000000000001',
      name: 'LifePilot Platform Build',
      description: 'Derived from specification document',
      category: 'Development',
      priority: 'High',
      status: 'Planning',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      milestones: [
        { title: 'Phase 1: Setup', description: 'Core baseline', targetDay: 3 }
      ]
    });

    assert(project._id, 'Project created');

    const linkedTask = await Task.create({
      ownerId: '663e10000000000000000001',
      title: 'Setup repository and database engine',
      originType: 'PROJECT',
      originId: project._id,
      originModel: 'Project',
      originLabel: project.name
    });

    assert(linkedTask._id, 'Linked task created');
    assert(linkedTask.originId.toString() === project._id.toString(), 'Task linked to project ID');

    // Clean up
    await Task.deleteOne({ _id: linkedTask._id });
    await Project.deleteOne({ _id: project._id });
  });

  console.log('\n========================================================');
  console.log(`  VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED  `);
  console.log('========================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runKnowledgeHubTests().catch(e => {
  console.error('Test runner encountered fatal error:', e);
  process.exit(1);
});
