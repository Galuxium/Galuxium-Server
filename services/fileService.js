const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Create directory if not exists
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Clean output directory
exports.cleanDirectory = (dirPath) => {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
  ensureDirectory(dirPath);
};

// Write files to disk
exports.writeFiles = (files, outputDir) => {
  files.forEach(({ path: filePath, content }) => {
    const fullPath = path.join(outputDir, filePath);
    const dir = path.dirname(fullPath);
    ensureDirectory(dir);   // ✅ Ensure nested directories exist
    fs.writeFileSync(fullPath, content, 'utf-8');
  });
};

// Zip directory into output file
exports.createZip = (sourceDir, zipPath) => {
  return new Promise((resolve, reject) => {
    ensureDirectory(path.dirname(zipPath));  // ✅ Ensure zip folder exists

    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
};
