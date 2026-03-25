const fs = require("fs");
const { BFF_LOG_PATH, GO_LOG_PATH } = require("./constants");

function toPositiveInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) {
    return fallback;
  }
  return n;
}

function parseDateToMs(value) {
  if (!value) {
    return null;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.getTime();
}

function normalizeSource(value) {
  const source = String(value || "").toLowerCase();
  if (source === "bff" || source === "go") {
    return source;
  }
  return "";
}

function getFilePathBySource(source) {
  if (source === "bff") {
    return BFF_LOG_PATH;
  }
  if (source === "go") {
    return GO_LOG_PATH;
  }
  return "";
}

function normalizeTime(value, fallbackMs) {
  if (!value) {
    return {
      timestampMs: fallbackMs,
      timestamp: new Date(fallbackMs).toISOString()
    };
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return {
      timestampMs: fallbackMs,
      timestamp: new Date(fallbackMs).toISOString()
    };
  }
  return {
    timestampMs: d.getTime(),
    timestamp: d.toISOString()
  };
}

function normalizeGoTimestamp(rawTs, fallbackMs) {
  if (!rawTs) {
    return normalizeTime(null, fallbackMs);
  }
  const normalized = String(rawTs).replace(/\//g, "-").replace(" ", "T");
  return normalizeTime(normalized, fallbackMs);
}

function readRecentLines(filePath, maxLines) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const content = fs.readFileSync(filePath, "utf8");
    if (!content) {
      return [];
    }
    const lines = content.split(/\r?\n/).filter(Boolean);
    if (lines.length <= maxLines) {
      return lines;
    }
    return lines.slice(lines.length - maxLines);
  } catch (error) {
    return [];
  }
}

function summarizeAction(items) {
  const summary = {
    create: 0,
    delete: 0,
    update: 0,
    read: 0,
    system: 0,
    error: 0
  };
  items.forEach((item) => {
    if (!Object.prototype.hasOwnProperty.call(summary, item.actionType)) {
      return;
    }
    summary[item.actionType] += 1;
  });
  return summary;
}

function removeFirstMatchedLine(filePath, targetLine) {
  if (!fs.existsSync(filePath)) {
    return { removed: false, reason: "file_not_found" };
  }

  const text = fs.readFileSync(filePath, "utf8");
  if (!text) {
    return { removed: false, reason: "empty_file" };
  }

  const lines = text.split(/\r?\n/);
  const index = lines.findIndex((line) => line === targetLine);
  if (index < 0) {
    return { removed: false, reason: "line_not_found" };
  }

  lines.splice(index, 1);
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  const nextText = lines.join("\n");
  fs.writeFileSync(filePath, nextText ? `${nextText}\n` : "", "utf8");
  return { removed: true };
}

function clearLogFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      cleared: 0,
      exists: false
    };
  }

  const text = fs.readFileSync(filePath, "utf8");
  const cleared = text ? text.split(/\r?\n/).filter(Boolean).length : 0;
  fs.writeFileSync(filePath, "", "utf8");

  return {
    cleared,
    exists: true
  };
}

module.exports = {
  toPositiveInt,
  parseDateToMs,
  normalizeSource,
  getFilePathBySource,
  normalizeTime,
  normalizeGoTimestamp,
  readRecentLines,
  summarizeAction,
  removeFirstMatchedLine,
  clearLogFile,
};
