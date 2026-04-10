#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'artifacts',
  'coverage',
  'build',
  '.next',
  '.nuxt',
  '.output',
  '.turbo',
  '.idea',
  '.vscode-test',
]);

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.bmp',
  '.ico',
  '.icns',
  '.pdf',
  '.zip',
  '.gz',
  '.tgz',
  '.7z',
  '.rar',
  '.jar',
  '.keystore',
  '.mp3',
  '.mp4',
  '.mov',
  '.avi',
  '.mkv',
  '.webm',
  '.heic',
  '.heif',
  '.avif',
  '.db',
  '.sqlite',
  '.sqlite3',
  '.ttf',
  '.woff',
  '.woff2',
  '.eot',
  '.otf',
  '.so',
  '.dylib',
  '.class',
  '.pyc',
  '.lockb',
]);

const REPLACEMENT_CHAR = String.fromCharCode(0xfffd);

const MOJIBAKE_TOKENS = [
  '\u59dd\uff45\u6e6a',
  '\u7487\ufe3d\u510f',
  '\u6fb6\u8fab\u89e6',
  '\u6d93\u5d88\u5158',
  '\u5bb8\u63d2\u74e8\u9366',
  '\u9429\u7a3f\u6093',
  '\u93cd\u714e\u7d21',
  '\u9354\u72ba\u6d47',
  '\u93b4\u612c\u59db',
  '\u7487\u950b\u7730',
  '\u9359\u509b\u669f',
  '\u93c3\u72b3\u6665',
  '\u7035\u55d9\u721c',
  '\u6960\u621e\u589c',
  '\u935f\u55d8\u57db',
  '\u9422\u3126\u57db',
  '\u7487\u75af\u7ded',
  '\u8930\u64b3\u58a0',
  '\u93c2\u677f\u7611',
  '\u6fee\u64b3\u6095',
  '\u6d93\u5a41\u7d36',
  '\u947e\u5cf0\u5f47',
  '\u95b2\u5d87\u7c8d',
  '\u7459\u6395\u58ca',
  '\u951f',
  '\u951b',
  '\u9286',
  '\u9225',
  '\u9229',
  '\u922b',
  '\u951a',
  '\u951c',
  '\u951d',
  '\u00c3',
  '\u00c2',
  '\u00e2\u20ac\u2122',
  '\u00e2\u20ac\u0153',
  '\u00e2\u20ac',
  '\u00e2\u20ac\u201c',
  '\u00e2\u20ac\u201d',
  '\u00e3\u20ac',
  '\u00ef\u00bc',
  '\u00ef\u00bd',
];

const SUSPICIOUS_CHARS = new Set([...new Set(MOJIBAKE_TOKENS.join(''))]);

const hits = [];

walk(ROOT);

if (hits.length > 0) {
  console.error('Found possible mojibake or invalid UTF-8:');
  for (const hit of hits) {
    console.error(hit);
  }
  process.exitCode = 1;
} else {
  console.log('No mojibake or invalid UTF-8 found.');
}

function walk(dirPath) {
  let entries = [];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (error) {
    hits.push(`[walk-error] ${rel(dirPath)}: ${error.message}`);
    return;
  }

  for (const entry of entries) {
    if (entry.name === '.' || entry.name === '..') {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }
      inspectName(fullPath, true);
      walk(fullPath);
      continue;
    }

    inspectName(fullPath, false);
    if (entry.isFile()) {
      inspectFile(fullPath);
    }
  }
}

function inspectName(fullPath, isDir) {
  const name = path.basename(fullPath);
  if (name === '.DS_Store') {
    return;
  }

  const suspiciousCount = countSuspiciousChars(name);
  if (name.includes(REPLACEMENT_CHAR) || matchesPattern(name) || suspiciousCount >= 4) {
    hits.push(`[${isDir ? 'dir' : 'name'}] ${rel(fullPath)}`);
  }
}

function inspectFile(fullPath) {
  if (BINARY_EXTENSIONS.has(path.extname(fullPath).toLowerCase())) {
    return;
  }

  let buffer;
  try {
    buffer = fs.readFileSync(fullPath);
  } catch (error) {
    hits.push(`[read-error] ${rel(fullPath)}: ${error.message}`);
    return;
  }

  if (buffer.includes(0)) {
    return;
  }

  const text = buffer.toString('utf8');
  if (text.includes(REPLACEMENT_CHAR)) {
    hits.push(`[utf8] ${rel(fullPath)} contains replacement characters`);
  }

  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) {
      continue;
    }

    const suspiciousCount = countSuspiciousChars(line);
    if (matchesPattern(line) || suspiciousCount >= 5) {
      hits.push(`[text] ${rel(fullPath)}:${index + 1}: ${line.trim()}`);
    }
  }
}

function matchesPattern(value) {
  return MOJIBAKE_TOKENS.some((token) => value.includes(token));
}

function countSuspiciousChars(value) {
  let count = 0;
  for (const char of value) {
    if (SUSPICIOUS_CHARS.has(char)) {
      count += 1;
    }
  }
  return count;
}

function rel(fullPath) {
  return path.relative(ROOT, fullPath) || '.';
}
