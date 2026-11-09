const aiProvider = require('./aiProvider');
const promptTemplates = require('./promptTemplates');

class KnowledgeAgent {
  async summarizeDocument({ documentName, textSample, totalCharacters }) {
    const activeProvider = aiProvider.getActiveProvider();

    if (activeProvider !== 'demo') {
      try {
        const messages = [
          { role: 'system', content: promptTemplates.DOCUMENT_INTELLIGENCE },
          { role: 'user', content: `Document: "${documentName}"\nExtracted Content:\n${textSample.slice(0, 10000)}` }
        ];

        const res = await aiProvider.generateChat(messages, { temperature: 0.3 });
        const parsed = aiProvider.safeParseJson(res.content);

        if (parsed && (parsed.shortSummary || parsed.importantPoints)) {
          return {
            success: true,
            data: parsed,
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

  generateStructuredSampleSummary(documentName, textSample, totalCharacters) {
    // Generate intelligent insights based on document content
    const samplePreview = (textSample || '').slice(0, 300).trim();

    return {
      shortSummary: `This document ("${documentName}") covers key project specifications, operational timelines, and actionable requirements spanning ${totalCharacters} characters.`,
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
      ]
    };
  }

  async answerDocumentQuestion({ document, chunks = [], question }) {
    const activeProvider = aiProvider.getActiveProvider();

    const excerptsText = chunks
      .map(c => `[Chunk ${c.chunkIndex + 1}${c.pageNumber ? ` | Page ${c.pageNumber}` : ''}]:\n${c.content}`)
      .join('\n\n---\n\n');

    if (activeProvider !== 'demo') {
      try {
        const messages = [
          {
            role: 'system',
            content: `You are LifePilot Document Assistant. Answer the user's question accurately using ONLY the provided excerpts from "${document.originalName}".
If citing page numbers, cite ONLY if explicit in the excerpt. If page number is unknown, specify that the reference is based on chunk ${chunks[0]?.chunkIndex + 1 || 1}.
Always list source citations at the end of your response.`
          },
          {
            role: 'user',
            content: `Context:\n${excerptsText}\n\nQuestion: ${question}`
          }
        ];

        const res = await aiProvider.generateChat(messages);
        return {
          answer: res.content,
          sources: chunks.map(c => ({
            chunkIndex: c.chunkIndex,
            pageNumber: c.pageNumber,
            excerpt: c.content.slice(0, 160) + '...'
          })),
          isDemoOutput: res.isDemoOutput,
          provider: res.provider
        };
      } catch (err) {
        console.warn('[KnowledgeAgent] Question answering failed, using fallback:', err.message);
      }
    }

    const firstChunk = chunks[0];
    const excerpt = firstChunk ? firstChunk.content.slice(0, 220) + '...' : 'Document content extracted.';
    const pageRef = firstChunk?.pageNumber ? `Page ${firstChunk.pageNumber}` : `Section (Chunk ${firstChunk ? firstChunk.chunkIndex + 1 : 1})`;

    return {
      answer: `Based on **${document.originalName}**:\n\nThe document highlights key specifications relevant to your question: "${question}".\n\n> *"${excerpt}"*\n\nKey takeaways recommend following the stated action items and aligning milestone deadlines with your project schedule.\n\n*Source Reference:* **${document.originalName}**, ${pageRef}. (Note: Answer based on extracted document chunk without verified page-level references if page count is unindexed).`,
      sources: chunks.map(c => ({
        chunkIndex: c.chunkIndex,
        pageNumber: c.pageNumber,
        excerpt: c.content.slice(0, 160) + '...'
      })),
      isDemoOutput: true,
      provider: 'demo-mode'
    };
  }
}

module.exports = new KnowledgeAgent();
