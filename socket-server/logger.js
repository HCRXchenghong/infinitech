const levelPriority = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const configuredLevel = String(process.env.LOG_LEVEL || 'info').trim().toLowerCase();
const currentPriority = Object.prototype.hasOwnProperty.call(levelPriority, configuredLevel)
  ? levelPriority[configuredLevel]
  : levelPriority.info;

function shouldLog(level) {
  return levelPriority[level] <= currentPriority;
}

function formatPrefix(level) {
  return `[${new Date().toISOString()}] [${level.toUpperCase()}]`;
}

function write(level, args) {
  if (!shouldLog(level)) return;
  const prefix = formatPrefix(level);
  if (level === 'error') {
    console.error(prefix, ...args);
    return;
  }
  if (level === 'warn') {
    console.warn(prefix, ...args);
    return;
  }
  console.log(prefix, ...args);
}

export const logger = {
  error: (...args) => write('error', args),
  warn: (...args) => write('warn', args),
  info: (...args) => write('info', args),
  debug: (...args) => write('debug', args),
};

export default logger;
