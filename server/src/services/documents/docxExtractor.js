const fs = require('fs');
const mammoth = require('mammoth');

const extractDocx = async (filePath) => {
  const result = await mammoth.extractRawText({ path: filePath });
  return {
    text: result.value || '',
    totalPages: null,
    messages: result.messages || []
  };
};

module.exports = { extractDocx };

