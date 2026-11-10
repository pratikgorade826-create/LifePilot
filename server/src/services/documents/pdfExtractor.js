const fs = require('fs');
const pdfParse = require('pdf-parse');

const extractPdf = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);

  return {
    text: data.text || '',
    totalPages: data.numpages || 1,
    info: data.info || {}
  };
};

module.exports = { extractPdf };

