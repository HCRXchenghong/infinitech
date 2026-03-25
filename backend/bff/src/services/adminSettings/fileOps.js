const fs = require("fs");

function safeUnlinkTempFile(filePath) {
  if (!filePath) {
    return;
  }
  fs.unlink(filePath, () => {});
}

function clearLogFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { filePath, exists: false, cleared: 0 };
  }

  const rawText = fs.readFileSync(filePath, "utf8");
  const cleared = rawText ? rawText.split(/\r?\n/).filter(Boolean).length : 0;
  fs.writeFileSync(filePath, "", "utf8");
  return { filePath, exists: true, cleared };
}

module.exports = {
  safeUnlinkTempFile,
  clearLogFile,
};
