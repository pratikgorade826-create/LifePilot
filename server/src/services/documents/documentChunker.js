/**
 * Splits document text into manageable chunks for storage and retrieval.
 */
class DocumentChunker {
  chunkText(text, options = {}) {
    const {
      chunkSize = 1200,   // approximate characters (~300 tokens)
      chunkOverlap = 200,
      pageNumber = null
    } = options;

    if (!text || text.trim().length === 0) {
      return [];
    }

    const clean = text.replace(/\r\n/g, '\n').trim();
    const chunks = [];

    // Split paragraphs first
    const paragraphs = clean.split(/\n\s*\n/);
    let currentChunk = '';
    let chunkIndex = 0;

    for (const para of paragraphs) {
      const trimmedPara = para.trim();
      if (!trimmedPara) continue;

      if ((currentChunk + '\n\n' + trimmedPara).length <= chunkSize) {
        currentChunk = currentChunk ? currentChunk + '\n\n' + trimmedPara : trimmedPara;
      } else {
        if (currentChunk) {
          chunks.push({
            chunkIndex: chunkIndex++,
            pageNumber,
            content: currentChunk,
            charCount: currentChunk.length,
            keywords: this.extractKeywords(currentChunk)
          });
        }

        // If a single paragraph is larger than chunkSize, slice it
        if (trimmedPara.length > chunkSize) {
          let start = 0;
          while (start < trimmedPara.length) {
            const slice = trimmedPara.slice(start, start + chunkSize);
            chunks.push({
              chunkIndex: chunkIndex++,
              pageNumber,
              content: slice,
              charCount: slice.length,
              keywords: this.extractKeywords(slice)
            });
            start += (chunkSize - chunkOverlap);
          }
          currentChunk = '';
        } else {
          currentChunk = trimmedPara;
        }
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        chunkIndex: chunkIndex++,
        pageNumber,
        content: currentChunk,
        charCount: currentChunk.length,
        keywords: this.extractKeywords(currentChunk)
      });
    }

    return chunks;
  }

  extractKeywords(text) {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);

    const stopwords = new Set([
      'this', 'that', 'with', 'from', 'have', 'were', 'which', 'about', 'their', 'there',
      'these', 'could', 'would', 'should', 'other', 'being', 'between', 'into', 'under'
    ]);

    const freq = {};
    words.forEach(w => {
      if (!stopwords.has(w)) {
        freq[w] = (freq[w] || 0) + 1;
      }
    });

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word]) => word);
  }
}

module.exports = new DocumentChunker();
