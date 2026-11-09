const DocumentChunk = require('../../models/DocumentChunk');

class DocumentRetriever {
  /**
   * Retrieves most relevant chunks for a user query from a given document.
   */
  async retrieveChunks(documentId, query, maxChunks = 4) {
    if (!query || !query.trim()) {
      return DocumentChunk.find({ documentId }).sort({ chunkIndex: 1 }).limit(maxChunks);
    }

    const keywords = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);

    const allChunks = await DocumentChunk.find({ documentId }).sort({ chunkIndex: 1 });

    if (allChunks.length <= maxChunks) {
      return allChunks;
    }

    // Score each chunk
    const scored = allChunks.map(chunk => {
      const lower = chunk.content.toLowerCase();
      let score = 0;
      keywords.forEach(kw => {
        const matches = (lower.match(new RegExp(`\\b${kw}`, 'g')) || []).length;
        score += matches * 2;
        if (chunk.keywords && chunk.keywords.includes(kw)) {
          score += 3;
        }
      });
      return { chunk, score };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    // Pick top chunks (or first chunks if all score 0)
    const top = scored.slice(0, maxChunks).map(s => s.chunk);
    top.sort((a, b) => a.chunkIndex - b.chunkIndex);

    return top;
  }
}

module.exports = new DocumentRetriever();

