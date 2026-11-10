const aiProvider = require('./aiProvider');
const promptTemplates = require('./promptTemplates');

class KnowledgeAgent {
  /**
   * Comprehensive document summarization and metadata extraction
   */
  async summarizeDocument({ documentName, textSample, totalCharacters }) {
    const activeProvider = aiProvider.getActiveProvider();

    if (activeProvider !== 'demo') {
      try {
        const messages = [
          { role: 'system', content: promptTemplates.DOCUMENT_INTELLIGENCE },
          { role: 'user', content: `Document: "${documentName}"\nExtracted Content:\n${textSample.slice(0, 12000)}` }
        ];

        const res = await aiProvider.generateChat(messages, { temperature: 0.3, json: true });
        const parsed = aiProvider.safeParseJson(res.content);

        if (parsed && (parsed.shortSummary || parsed.importantPoints)) {
          return {
            success: true,
            data: {
              ...parsed,
              chapterSummaries: parsed.chapterSummaries || this.generateDefaultChapters(documentName, textSample)
            },
            isDemoOutput: res.isDemoOutput,
            provider: res.provider
          };
        }
      } catch (err) {
        console.warn('[KnowledgeAgent] Live summarize failed, using fallback:', err.message);
      }
    }

    return {
      success: true,
      data: this.generateStructuredSampleSummary(documentName, textSample, totalCharacters),
      isDemoOutput: true,
      provider: 'demo-mode'
    };
  }

  generateDefaultChapters(documentName, textSample) {
    const sample = textSample || '';
    const length = sample.length;
    return [
      {
        title: 'Chapter 1: Background & Objectives',
        summary: `Covers the operational context and baseline requirements established in ${documentName}.`,
        keyPoints: ['Initial scope definition', 'Baseline architecture targets']
      },
      {
        title: 'Chapter 2: Core Methodology & Implementation',
        summary: 'Details technical specifications, process flows, and delivery parameters.',
        keyPoints: ['Standardized protocols', 'Implementation milestones']
      },
      {
        title: 'Chapter 3: Verification, Deadlines & Next Steps',
        summary: 'Summarizes evaluation criteria, deliverables, deadlines, and milestone signoffs.',
        keyPoints: ['Quality criteria validation', 'Action item follow-ups']
      }
    ];
  }

  generateStructuredSampleSummary(documentName, textSample, totalCharacters) {
    const samplePreview = (textSample || '').slice(0, 300).trim();

    return {
      shortSummary: `This document ("${documentName}") outlines key project specifications, operational timelines, and actionable requirements spanning ${totalCharacters} characters.`,
      detailedSummary: `The document provides structured guidance and background details: "${samplePreview ? samplePreview.slice(0, 180) + '...' : 'General project guidelines and instructions'}". It emphasizes quality standards, deadline adherence, and modular execution across responsible teams.`,
      importantPoints: [
        `Primary focus is establishing verified deliverables for "${documentName}".`,
        'Includes explicit deadlines, milestones, and responsibility allocations.',
        'Requires rigorous quality testing and security validation prior to final signoff.',
        'Highlights proactive task tracking and cross-team communication.'
      ],
      keyFindings: [
        'Document stresses adherence to realistic budget and timeline targets.',
        'Clear criteria are provided for progress tracking and milestone signoffs.'
      ],
      importantDates: [
        { date: 'Phase 1 Delivery', event: 'Initial milestone completion & internal demo review' },
        { date: 'Phase 2 Final Submission', event: 'Full signoff, deployment verification & release' }
      ],
      importantEntities: [
        'LifePilot Core Team',
        'Project Steering Committee',
        'Product Stakeholders'
      ],
      actionItems: [
        {
          task: 'Review extracted specifications and confirm task priorities',
          priority: 'High',
          deadline: 'Day 2'
        },
        {
          task: 'Schedule alignment meeting with stakeholders regarding deliverables',
          priority: 'Medium',
          deadline: 'Day 4'
        },
        {
          task: 'Conduct intermediate progress check against milestone timeline',
          priority: 'Medium',
          deadline: 'Day 7'
        }
      ],
      chapterSummaries: this.generateDefaultChapters(documentName, textSample)
    };
  }

  /**
   * Evidence-based Single Document Q&A with verified citations
   */
  async answerDocumentQuestion({ document, chunks = [], question, conversationHistory = [] }) {
    const activeProvider = aiProvider.getActiveProvider();

    const excerptsText = chunks
      .map(c => `[Source: "${document.originalName}" | Chunk ${c.chunkIndex + 1}${c.pageNumber ? ` | Page ${c.pageNumber}` : ''}]:\n${c.content}`)
      .join('\n\n---\n\n');

    if (activeProvider !== 'demo') {
      try {
        const historyPrompt = conversationHistory.slice(-4).map(m => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
        const messages = [
          {
            role: 'system',
            content: `You are LifePilot AI Document Assistant.
Answer the user's question accurately using ONLY the provided document excerpts.
Always cite your evidence using exact source references format: [Source: Document Name, Page X or Chunk Y].
Never fabricate citations. If the excerpt does not contain the answer, explicitly state that the provided document content does not mention it.`
          },
          {
            role: 'user',
            content: `${historyPrompt ? `Recent Conversation:\n${historyPrompt}\n\n` : ''}Document Context:\n${excerptsText}\n\nQuestion: ${question}`
          }
        ];

        const res = await aiProvider.generateChat(messages, { temperature: 0.2 });
        return {
          answer: res.content,
          sources: chunks.map(c => ({
            documentId: document._id,
            documentName: document.originalName,
            chunkIndex: c.chunkIndex,
            pageNumber: c.pageNumber,
            excerpt: c.content.slice(0, 180) + '...',
            relevanceScore: c.score || 0.92
          })),
          isDemoOutput: res.isDemoOutput,
          provider: res.provider
        };
      } catch (err) {
        console.warn('[KnowledgeAgent] Question answering failed, using fallback:', err.message);
      }
    }

    const firstChunk = chunks[0];
    const excerpt = firstChunk ? firstChunk.content.slice(0, 220) + '...' : 'Extracted context.';
    const pageRef = firstChunk?.pageNumber ? `Page ${firstChunk.pageNumber}` : `Chunk ${firstChunk ? firstChunk.chunkIndex + 1 : 1}`;

    return {
      answer: `Based on **${document.originalName}** (${pageRef}):\n\nThe text addresses your query: "${question}".\n\n> *"${excerpt}"*\n\nAccording to this section, the recommended procedure is to adhere to the listed action items, milestone criteria, and validation standards.\n\n*Verified Citation:* [Source: ${document.originalName}, ${pageRef}]`,
      sources: chunks.map(c => ({
        documentId: document._id,
        documentName: document.originalName,
        chunkIndex: c.chunkIndex,
        pageNumber: c.pageNumber,
        excerpt: c.content.slice(0, 180) + '...',
        relevanceScore: 0.95
      })),
      isDemoOutput: true,
      provider: 'demo-mode'
    };
  }

  /**
   * Multi-Document Cross-Referencing Q&A
   */
  async answerMultiDocumentQuestion({ documents = [], chunks = [], question }) {
    const activeProvider = aiProvider.getActiveProvider();

    const excerptsText = chunks
      .map(c => `[Doc: "${c.documentName || 'Document'}" | Chunk ${c.chunkIndex + 1}${c.pageNumber ? ` | Page ${c.pageNumber}` : ''}]:\n${c.content}`)
      .join('\n\n---\n\n');

    if (activeProvider !== 'demo') {
      try {
        const messages = [
          {
            role: 'system',
            content: `You are LifePilot Multi-Document Intelligence Agent.
Answer the user's question across multiple provided documents.
Synthesize answers from all relevant documents, contrasting viewpoints when present.
Always cite which document and chunk/page each claim comes from.`
          },
          {
            role: 'user',
            content: `Multi-Document Context:\n${excerptsText}\n\nUser Question: ${question}`
          }
        ];

        const res = await aiProvider.generateChat(messages, { temperature: 0.2 });
        return {
          answer: res.content,
          sources: chunks.map(c => ({
            documentId: c.documentId,
            documentName: c.documentName,
            chunkIndex: c.chunkIndex,
            pageNumber: c.pageNumber,
            excerpt: c.content.slice(0, 180) + '...'
          })),
          isDemoOutput: res.isDemoOutput,
          provider: res.provider
        };
      } catch (err) {
        console.warn('[KnowledgeAgent] Multi-document Q&A failed, using fallback:', err.message);
      }
    }

    const docNames = documents.map(d => d.originalName).join(' and ');
    return {
      answer: `Comparing insights across **${docNames}**:\n\n1. Both sources address aspects of: "${question}".\n2. Key references indicate shared technical standards and collaborative milestone delivery.\n\n*Cross-Document Citations:*\n${chunks.slice(0, 3).map(c => `- [Source: ${c.documentName || 'Document'}, ${c.pageNumber ? `Page ${c.pageNumber}` : `Chunk ${c.chunkIndex + 1}`}]`).join('\n')}`,
      sources: chunks.map(c => ({
        documentId: c.documentId,
        documentName: c.documentName,
        chunkIndex: c.chunkIndex,
        pageNumber: c.pageNumber,
        excerpt: c.content.slice(0, 180) + '...'
      })),
      isDemoOutput: true,
      provider: 'demo-mode'
    };
  }

  /**
   * Multi-Document Comparison: Common topics, differences, conflicts, combined summary
   */
  async compareDocuments({ documents }) {
    if (!documents || documents.length < 2) {
      throw new Error('At least two documents are required for comparison.');
    }

    const activeProvider = aiProvider.getActiveProvider();
    const docSummaries = documents.map((d, i) => `=== DOCUMENT ${i + 1}: "${d.originalName}" ===\nSummary: ${d.shortSummary || ''}\nKey Points:\n${(d.importantPoints || []).join('\n')}\nDetailed:\n${(d.detailedSummary || '').slice(0, 3000)}`).join('\n\n');

    if (activeProvider !== 'demo') {
      try {
        const messages = [
          { role: 'system', content: promptTemplates.MULTI_DOCUMENT_COMPARISON },
          { role: 'user', content: docSummaries }
        ];

        const res = await aiProvider.generateChat(messages, { temperature: 0.3, json: true });
        const parsed = aiProvider.safeParseJson(res.content);
        if (parsed && parsed.commonTopics) {
          return {
            success: true,
            data: parsed,
            isDemoOutput: res.isDemoOutput,
            provider: res.provider
          };
        }
      } catch (err) {
        console.warn('[KnowledgeAgent] Comparison failed, using fallback:', err.message);
      }
    }

    const d1 = documents[0];
    const d2 = documents[1];

    return {
      success: true,
      data: {
        commonTopics: [
          {
            topic: 'Project Scope & Execution Timelines',
            description: `Both "${d1.originalName}" and "${d2.originalName}" highlight structured project milestones, phase-wise accountability, and deliverable tracking.`
          },
          {
            topic: 'Quality Standards & Testing Criteria',
            description: 'Both documents emphasize pre-release verification, review checkpoints, and quality benchmarks.'
          }
        ],
        differences: [
          {
            aspect: 'Operational Focus',
            documentAView: `"${d1.originalName}" focuses primarily on ${d1.importantEntities?.[0] || 'core technical requirements and workflow execution'}.`,
            documentBView: `"${d2.originalName}" places heavier emphasis on ${d2.importantEntities?.[0] || 'strategic planning and governance'}.`
          },
          {
            aspect: 'Timeline Scheduling',
            documentAView: `Stipulates immediate actions across ${(d1.actionItems || []).length} identified items.`,
            documentBView: `Emphasizes phased review stages with ${(d2.importantDates || []).length} milestone dates.`
          }
        ],
        conflicts: [
          {
            issue: 'Milestone Scheduling Variance',
            details: `Target completion windows between "${d1.originalName}" and "${d2.originalName}" differ in review frequency and deadline buffers.`
          }
        ],
        combinedSummary: `Synthesis of "${d1.originalName}" and "${d2.originalName}": Together, these documents form an integrated execution package. While the first establishes concrete technical requirements and task-level actions, the second supplies contextual governance and milestone frameworks.`,
        keyTakeaways: [
          'Harmonize deliverable deadlines across both document specifications.',
          'Consolidate action items into a single unified Kanban board.',
          'Schedule a joint alignment review to resolve pacing variances.'
        ]
      },
      isDemoOutput: true,
      provider: 'demo-mode'
    };
  }

  getDefaultStudyMaterials(docName) {
    return {
      mcqs: [
        {
          question: `What is the primary objective detailed in "${docName}"?`,
          options: [
            'Establish structured specifications and deliverable milestones',
            'Perform an unrelated external market survey',
            'Decommission legacy software immediately',
            'Ignore project deadlines and budget constraints'
          ],
          answer: 0,
          explanation: 'The document explicitly establishes structured specifications, milestone targets, and verification criteria.'
        },
        {
          question: `How are quality standards evaluated according to the document?`,
          options: [
            'Informal verbal confirmation only',
            'Rigorous phased testing and milestone validation before final signoff',
            'Random selection of incomplete deliverables',
            'Post-release troubleshooting without prior checks'
          ],
          answer: 1,
          explanation: 'The text highlights phased testing, milestone reviews, and quality benchmarks prior to release.'
        },
        {
          question: `What is the recommended approach for team action items in "${docName}"?`,
          options: [
            'Proactive tracking and milestone alignment',
            'Deferred execution until end of quarter',
            'Manual paper logging exclusively',
            'No task tracking is required'
          ],
          answer: 0,
          explanation: 'The specifications emphasize converting requirements into persistent, trackable tasks.'
        }
      ],
      flashcards: [
        {
          front: `Core Mission of "${docName}"`,
          back: 'Provide clear technical roadmap, deliverable standards, and milestone criteria.',
          category: 'Core Concepts'
        },
        {
          front: 'Phase 1 Milestone Requirement',
          back: 'Initial architecture foundation, setup validation, and stakeholder alignment.',
          category: 'Deliverables'
        },
        {
          front: 'Quality Assurance Benchmark',
          back: 'Zero-regression verification test suite pass rate and security review.',
          category: 'Testing'
        },
        {
          front: 'Action Item Conversion Rule',
          back: 'All extracted document requirements must receive user approval before becoming tasks.',
          category: 'Workflow'
        }
      ],
      descriptiveQuestions: [
        {
          question: `Analyze the main architectural decisions and milestones proposed in "${docName}".`,
          modelAnswer: `The document outlines a structured, phased approach focusing on foundational setup in Phase 1, feature integration in Phase 2, and rigorous quality validation before final signoff. It balances speed of delivery with strict adherence to architectural standards.`,
          points: [
            'Identifies multi-phase execution strategy',
            'Details quality assurance criteria',
            'Explains risk mitigation and deadline buffers'
          ]
        },
        {
          question: `Discuss the risk factors and dependencies highlighted in the document and how they can be mitigated.`,
          modelAnswer: `Key dependencies include timely cross-team alignment, environment configurations, and milestone signoffs. Mitigation is achieved through proactive task scheduling, regular check-ins, and automated testing.`,
          points: [
            'Identifies cross-functional dependencies',
            'Proposes automated verification',
            'Emphasizes proactive timeline buffers'
          ]
        }
      ],
      studyNotes: [
        {
          topic: 'Executive Synthesis & Scope',
          notes: `• Document Name: ${docName}\n• Primary Focus: Modular execution, quality gates, and milestone tracking.\n• Governance: Regular reviews and clear ownership.`,
          keyTakeaways: [
            'Scope is bounded and prioritized by urgency',
            'All key deliverables have defined owners'
          ]
        },
        {
          topic: 'Implementation Strategy & Best Practices',
          notes: '• Stage 1: Setup and baseline validation.\n• Stage 2: Feature development and iterative review.\n• Stage 3: Verification and documentation.',
          keyTakeaways: [
            'Prevent regressions through automated test runs',
            'Maintain persistent logs for all action items'
          ]
        }
      ],
      revisionPlan: [
        {
          day: 1,
          focusTopic: 'Foundations & Scope Overview',
          tasks: [`Review executive summary of ${docName}`, 'Go through initial 4 flashcards'],
          durationMinutes: 30
        },
        {
          day: 2,
          focusTopic: 'Core Concepts & Terminology',
          tasks: ['Study Chapter 1 & 2 summaries', 'Complete MCQ quiz (Target: >=80%)'],
          durationMinutes: 45
        },
        {
          day: 3,
          focusTopic: 'In-Depth Analysis & Descriptive Practice',
          tasks: ['Draft answer for Descriptive Question 1', 'Submit for AI answer evaluation'],
          durationMinutes: 45
        },
        {
          day: 4,
          focusTopic: 'Action Items & Practical Application',
          tasks: ['Review all action items', 'Convert key items into Central Tasks'],
          durationMinutes: 30
        },
        {
          day: 5,
          focusTopic: 'Final Revision & Concept Mastery',
          tasks: ['Review all flashcards in Review Mode', 'Retake MCQs to verify 100% mastery'],
          durationMinutes: 30
        }
      ]
    };
  }

  /**
   * AI Study Assistant: Generate MCQs, Flashcards, Descriptive Questions, Study Notes, Revision Plan
   */
  async generateStudyMaterials({ document, textSample, type = 'all' }) {
    const activeProvider = aiProvider.getActiveProvider();
    const sample = (textSample || document.detailedSummary || '').slice(0, 10000);
    const docName = document.originalName || 'Document';
    const defaults = this.getDefaultStudyMaterials(docName);

    if (activeProvider !== 'demo') {
      try {
        const messages = [
          { role: 'system', content: promptTemplates.STUDY_MATERIALS_GENERATOR },
          { role: 'user', content: `Document: "${docName}"\nType Requested: ${type}\nContent:\n${sample}` }
        ];

        const res = await aiProvider.generateChat(messages, { temperature: 0.4, json: true });
        const parsed = aiProvider.safeParseJson(res.content);
        if (parsed && (parsed.mcqs || parsed.flashcards)) {
          return {
            success: true,
            data: {
              mcqs: Array.isArray(parsed.mcqs) && parsed.mcqs.length > 0 ? parsed.mcqs : defaults.mcqs,
              flashcards: Array.isArray(parsed.flashcards) && parsed.flashcards.length > 0 ? parsed.flashcards : defaults.flashcards,
              descriptiveQuestions: Array.isArray(parsed.descriptiveQuestions) && parsed.descriptiveQuestions.length > 0 ? parsed.descriptiveQuestions : defaults.descriptiveQuestions,
              studyNotes: Array.isArray(parsed.studyNotes) && parsed.studyNotes.length > 0 ? parsed.studyNotes : defaults.studyNotes,
              revisionPlan: Array.isArray(parsed.revisionPlan) && parsed.revisionPlan.length >= 3 ? parsed.revisionPlan : defaults.revisionPlan
            },
            isDemoOutput: res.isDemoOutput,
            provider: res.provider
          };
        }
      } catch (err) {
        console.warn('[KnowledgeAgent] Study materials generation failed, using fallback:', err.message);
      }
    }

    return {
      success: true,
      data: defaults,
      isDemoOutput: true,
      provider: 'demo-mode'
    };
  }

  /**
   * AI Answer Evaluator: Grades user answers against a question and model answer
   */
  async evaluateAnswer({ question, modelAnswer, userAnswer }) {
    if (!userAnswer || !userAnswer.trim()) {
      return {
        score: 0,
        verdict: 'Incomplete',
        feedback: 'No answer was provided. Please write your explanation to receive evaluation.',
        strengths: [],
        missedPoints: ['Empty response submission'],
        improvedAnswer: modelAnswer || 'A complete answer addressing all key facets of the question.'
      };
    }

    const activeProvider = aiProvider.getActiveProvider();

    if (activeProvider !== 'demo') {
      try {
        const messages = [
          { role: 'system', content: promptTemplates.ANSWER_EVALUATION },
          {
            role: 'user',
            content: `Question: ${question}\nModel Answer/Key Points: ${modelAnswer}\n\nStudent Answer:\n"${userAnswer}"`
          }
        ];

        const res = await aiProvider.generateChat(messages, { temperature: 0.2, json: true });
        const parsed = aiProvider.safeParseJson(res.content);
        if (parsed && typeof parsed.score === 'number') {
          return {
            ...parsed,
            isDemoOutput: res.isDemoOutput,
            provider: res.provider
          };
        }
      } catch (err) {
        console.warn('[KnowledgeAgent] Answer evaluation failed, using fallback:', err.message);
      }
    }

    // Heuristic scoring based on keyword overlap, stem matching, and length
    const cleanWord = w => w.toLowerCase().replace(/[^a-z0-9]/g, '');
    const userWords = userAnswer.toLowerCase().split(/\s+/).map(cleanWord).filter(w => w.length > 2);
    const modelWords = (modelAnswer || '').toLowerCase().split(/\s+/).map(cleanWord).filter(w => w.length > 3);

    // Check stem or partial matches (e.g. limit/limits, scan/scanning, upload/uploaded, untrust/untrusted)
    const matchCount = modelWords.filter(mw => {
      const stem = mw.length > 4 ? mw.slice(0, 4) : mw;
      return userWords.some(uw => uw.includes(stem) || (uw.length >= 4 && stem.includes(uw.slice(0, 4))));
    }).length;

    const overlapRatio = modelWords.length > 0 ? matchCount / modelWords.length : 0.5;
    const baseScore = Math.min(95, Math.max(50, Math.round(50 + overlapRatio * 42 + Math.min(8, userWords.length))));

    let verdict = 'Needs Improvement';
    if (baseScore >= 85) verdict = 'Excellent';
    else if (baseScore >= 70) verdict = 'Good';

    return {
      score: baseScore,
      verdict,
      strengths: [
        'Addresses the core question directly',
        userWords.length > 20 ? 'Good depth of explanation provided' : 'Concise initial formulation'
      ],
      missedPoints: [
        'Could include more specific technical terminology from the source text',
        'Elaborate on real-world verification and milestone impact'
      ],
      feedback: `You demonstrated a solid understanding of the concepts (${baseScore}/100). To elevate this to top marks, integrate direct citations and quantify the expected outcomes.`,
      improvedAnswer: modelAnswer || userAnswer,
      isDemoOutput: true,
      provider: 'demo-mode'
    };
  }

  /**
   * Academic Research Paper Analysis
   */
  async analyzeResearchPaper({ document, textSample }) {
    const activeProvider = aiProvider.getActiveProvider();
    const sample = (textSample || document.detailedSummary || '').slice(0, 12000);

    if (activeProvider !== 'demo') {
      try {
        const messages = [
          { role: 'system', content: promptTemplates.RESEARCH_ANALYSIS },
          { role: 'user', content: `Document Title: "${document.originalName}"\nText Sample:\n${sample}` }
        ];

        const res = await aiProvider.generateChat(messages, { temperature: 0.3, json: true });
        const parsed = aiProvider.safeParseJson(res.content);
        if (parsed && parsed.methodology) {
          return {
            success: true,
            data: parsed,
            isDemoOutput: res.isDemoOutput,
            provider: res.provider
          };
        }
      } catch (err) {
        console.warn('[KnowledgeAgent] Research analysis failed, using fallback:', err.message);
      }
    }

    return {
      success: true,
      data: {
        abstractSummary: `Scholarly investigation into "${document.originalName}". The document formalizes domain methodologies, empirical parameters, and validation standards to advance operational efficiency.`,
        methodology: 'Employs a structured modular framework incorporating continuous data validation, boundary condition stress tests, and reproducible milestone benchmarks.',
        keyResults: 'Demonstrates a 100% adherence to verification requirements, reproducible metric tracking, and measurable reduction in coordination bottlenecks.',
        criticalEvaluation: 'Strong systematic approach with clear milestones. Assumptions rely on active cross-functional alignment and timely stakeholder inputs.',
        limitations: 'Contextual constraints include reliance on textual inputs and external API availability during live execution.',
        practicalApplications: [
          'Enterprise knowledge management and automated document synthesis',
          'Academic course study planning and rapid syllabus revision',
          'Cross-team technical project roadmap formulation'
        ]
      },
      isDemoOutput: true,
      provider: 'demo-mode'
    };
  }

  /**
   * Knowledge Graph Extraction
   */
  async generateKnowledgeGraph({ document, textSample }) {
    const activeProvider = aiProvider.getActiveProvider();
    const sample = (textSample || document.detailedSummary || '').slice(0, 10000);

    if (activeProvider !== 'demo') {
      try {
        const messages = [
          { role: 'system', content: promptTemplates.KNOWLEDGE_GRAPH_EXTRACTOR },
          { role: 'user', content: `Document Title: "${document.originalName}"\nContent:\n${sample}` }
        ];

        const res = await aiProvider.generateChat(messages, { temperature: 0.3, json: true });
        const parsed = aiProvider.safeParseJson(res.content);
        if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
          return {
            success: true,
            data: parsed,
            isDemoOutput: res.isDemoOutput,
            provider: res.provider
          };
        }
      } catch (err) {
        console.warn('[KnowledgeAgent] Knowledge graph generation failed, using fallback:', err.message);
      }
    }

    const docTitle = document.originalName.replace(/\.[^/.]+$/, '');
    const entities = document.importantEntities || ['Architecture', 'Milestones', 'Testing', 'Security'];

    const nodes = [
      { id: 'doc-root', label: docTitle, type: 'document' },
      { id: 'concept-scope', label: 'Project Scope', type: 'concept' },
      { id: 'concept-milestones', label: 'Milestones & Delivery', type: 'process' },
      { id: 'tech-platform', label: 'LifePilot Platform', type: 'technology' },
      ...entities.slice(0, 4).map((ent, idx) => ({
        id: `entity-${idx + 1}`,
        label: ent,
        type: 'concept'
      }))
    ];

    const edges = [
      { from: 'doc-root', to: 'concept-scope', relationship: 'defines' },
      { from: 'doc-root', to: 'concept-milestones', relationship: 'schedules' },
      { from: 'concept-scope', to: 'tech-platform', relationship: 'implemented_on' },
      ...entities.slice(0, 4).map((_, idx) => ({
        from: 'doc-root',
        to: `entity-${idx + 1}`,
        relationship: 'references'
      }))
    ];

    return {
      success: true,
      data: { nodes, edges },
      isDemoOutput: true,
      provider: 'demo-mode'
    };
  }

  /**
   * Project Roadmap Extraction: Turns document requirements into LifePilot Project structure
   */
  async extractProjectRoadmap({ document, textSample }) {
    const activeProvider = aiProvider.getActiveProvider();
    const sample = (textSample || document.detailedSummary || '').slice(0, 10000);

    if (activeProvider !== 'demo') {
      try {
        const messages = [
          { role: 'system', content: promptTemplates.PROJECT_ROADMAP_EXTRACTOR },
          { role: 'user', content: `Document Title: "${document.originalName}"\nContent:\n${sample}` }
        ];

        const res = await aiProvider.generateChat(messages, { temperature: 0.4, json: true });
        const parsed = aiProvider.safeParseJson(res.content);
        if (parsed && parsed.projectName && Array.isArray(parsed.milestones)) {
          return {
            success: true,
            data: parsed,
            isDemoOutput: res.isDemoOutput,
            provider: res.provider
          };
        }
      } catch (err) {
        console.warn('[KnowledgeAgent] Roadmap extraction failed, using fallback:', err.message);
      }
    }

    const cleanTitle = document.originalName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    return {
      success: true,
      data: {
        projectName: cleanTitle,
        description: `Project execution roadmap synthesized directly from "${document.originalName}". Covers core objectives, implementation phases, and verifiable milestone deliverables.`,
        category: 'Development',
        priority: 'High',
        milestones: [
          {
            title: 'Phase 1: Setup & Architecture Baseline',
            description: 'Establish project foundation, review document parameters, and configure environment.',
            tasks: [
              'Initialize repository and install all required runtime dependencies',
              'Configure database models and verify zero-regression baseline'
            ]
          },
          {
            title: 'Phase 2: Core Feature Implementation',
            description: 'Implement primary specifications outlined in the source document.',
            tasks: [
              'Develop core business logic and modular controller endpoints',
              'Build responsive user interfaces matching the design palette'
            ]
          },
          {
            title: 'Phase 3: Verification, Testing & Final Release',
            description: 'Execute comprehensive automated test suite and finalize documentation.',
            tasks: [
              'Run complete verification test suite (100% target)',
              'Review user feedback and deploy to production environment'
            ]
          }
        ]
      },
      isDemoOutput: true,
      provider: 'demo-mode'
    };
  }
}

module.exports = new KnowledgeAgent();
