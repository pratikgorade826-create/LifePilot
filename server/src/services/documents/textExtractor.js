const fs = require('fs');

const extractText = async (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  return {
    text: content || '',
    totalPages: null
  };
};

module.exports = { extractText };

