/**
 * LifePilot AI - End-to-End Core Verification Suite
 */
const intentClassifier = require('./services/ai/intentClassifier');
const travelAgent = require('./services/ai/travelAgent');
const projectAgent = require('./services/ai/projectAgent');
const knowledgeAgent = require('./services/ai/knowledgeAgent');
const documentChunker = require('./services/documents/documentChunker');
const orchestrator = require('./services/ai/orchestrator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const env = require('./config/env');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING LIFEPILOT AI VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
    }
  }

  // TEST 1: Intent Detection - Travel
  const travelInput = 'Plan a 5-day Goa trip for four friends under ₹15,000 per person.';
  const travelIntent = await intentClassifier.classify(travelInput);
  assert(travelIntent.intent === 'TRAVEL', `Scenario 1 Intent: "${travelInput}" -> Expected TRAVEL, Got: ${travelIntent.intent}`);

  // TEST 2: Travel Agent Workflow & Structured Breakdown
  const tripPlan = await travelAgent.planTrip({
    destination: 'Goa',
    durationDays: 5,
    travelersCount: 4,
    totalBudget: 60000,
    travelStyle: 'Budget',
    interests: ['Beaches', 'Food']
  });
  assert(tripPlan.success === true, 'Travel Agent executed successfully');
  assert(tripPlan.data.itinerary.length === 5, `Generated 5-day itinerary (got ${tripPlan.data.itinerary.length} days)`);
  assert(tripPlan.data.budgetBreakdown.totalEstimated === 60000, 'Budget breakdown matches requested total');
  assert(tripPlan.data.budgetBreakdown.budgetPerPerson === 15000, 'Per-person budget calculation matches (₹15,000/person)');
  assert(tripPlan.data.packingChecklist.length > 0, 'Packing checklist generated with items');
  assert(tripPlan.data.budgetBreakdown.isEstimateNotice.length > 0, 'Budget contains standard estimate notice without live booking claim');

  // TEST 3: Intent Detection - Project
  const projectInput = 'Help me build a college website in 10 days.';
  const projectIntent = await intentClassifier.classify(projectInput);
  assert(projectIntent.intent === 'PROJECT', `Scenario 2 Intent: "${projectInput}" -> Expected PROJECT, Got: ${projectIntent.intent}`);

  // TEST 4: Project Agent Decomposition
  const projectPlan = await projectAgent.planProject({
    name: 'College Portal',
    durationDays: 10,
    availableWorkingHours: 25
  });
  assert(projectPlan.success === true, 'Project Agent executed successfully');
  assert(projectPlan.data.milestones.length >= 3, `Project has milestones (got ${projectPlan.data.milestones.length})`);
  assert(projectPlan.data.tasks.length >= 4, `Project generated actionable tasks (got ${projectPlan.data.tasks.length})`);
  assert(projectPlan.data.completionChecklist.length > 0, 'Project generated signoff checklist');

  // TEST 5: Document Chunking & Text Extraction Intelligence
  const sampleDocText = `
    LIFE-PILOT REQUIREMENTS SPECIFICATION
    Phase 1: Implement unified intelligent assistant for hackathon.
    Key deadline: All modules must be tested by Day 2.
    The team will deploy frontend on Vercel and backend on Render with MongoDB Atlas.
    Security mandates: Never expose API keys on client; store passwords using bcrypt.
  `.repeat(10);

  const chunks = documentChunker.chunkText(sampleDocText, { chunkSize: 500 });
  assert(chunks.length >= 2, `Document Chunking created multiple chunks (got ${chunks.length})`);
  assert(chunks[0].charCount > 0, 'Chunk contains character length metadata');

  const docSummary = await knowledgeAgent.summarizeDocument({
    documentName: 'requirements.pdf',
    textSample: sampleDocText,
    totalCharacters: sampleDocText.length
  });
  assert(docSummary.success === true, 'Knowledge Agent generated document summary');
  assert(docSummary.data.shortSummary.length > 0, 'Short summary is present');
  assert(docSummary.data.actionItems.length > 0, 'Action items were extracted for task conversion');

  // TEST 6: Intent Detection - Task Creation
  const taskInput = 'Create a task to complete my database design by tomorrow.';
  const taskIntent = await intentClassifier.classify(taskInput);
  assert(taskIntent.intent === 'TASK', `Scenario 4 Intent: "${taskInput}" -> Expected TASK, Got: ${taskIntent.intent}`);

  // TEST 7: Orchestrator End-to-End Loop
  const orchResult = await orchestrator.processUserMessage({
    userId: '60d0fe4f5311236168a109ca',
    message: 'Plan a 5-day Goa trip under 20000',
    conversationId: null
  });
  assert(orchResult.intent === 'TRAVEL', 'Orchestrator routed travel query to TRAVEL intent');
  assert(orchResult.actionSuggested === 'SAVE_TRIP', 'Orchestrator suggested SAVE_TRIP action with structured data');
  assert(orchResult.structuredData !== null, 'Orchestrator returned structured data payload');

  // TEST 8: Auth & Security (Bcrypt & JWT)
  const password = 'securePassword123!';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  const match = await bcrypt.compare(password, hash);
  assert(match === true, 'Bcrypt password hashing and verification verified');

  const token = jwt.sign({ id: 'user_123' }, env.JWT_SECRET, { expiresIn: '1h' });
  const decoded = jwt.verify(token, env.JWT_SECRET);
  assert(decoded.id === 'user_123', 'JWT generation and verification verified');

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================');
}

runTests().catch(console.error);
