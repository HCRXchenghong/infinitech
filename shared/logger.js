/**
 * 统一日志工具
 * 开发环境: 输出所有日志到控制台
 * 生产环境: 只输出 error 和 warn
 */

const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev';

const logger = {
  log: (...args) => {
    if (isDev) {
      console.log(...args);
    }
  },

  error: (...args) => {
    // 错误始终记录
    console.error(...args);
  },

  warn: (...args) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  info: (...args) => {
    if (isDev) {
      console.info(...args);
    }
  },

  debug: (...args) => {
    if (isDev) {
      console.debug(...args);
    }
  }
};

// CommonJS 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { logger };
}

// ES Module 导出
if (typeof exports !== 'undefined') {
  exports.logger = logger;
}

// 浏览器环境
if (typeof window !== 'undefined') {
  window.logger = logger;
}
