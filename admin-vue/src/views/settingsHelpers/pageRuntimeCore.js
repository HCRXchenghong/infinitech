function normalizeTaskFactories(taskFactories = []) {
  return Array.isArray(taskFactories)
    ? taskFactories.filter((task) => typeof task === 'function')
    : [];
}

export function resolveSettledTaskGroupError(results, options = {}) {
  const settled = Array.isArray(results) ? results : [];
  const rejectedIndex = settled.findIndex((item) => item?.status === 'rejected');
  if (rejectedIndex < 0) {
    return '';
  }

  if (options.mode !== 'first_rejected') {
    return options.partialFailureMessage || '部分系统配置加载失败，请稍后重试';
  }

  const fallbackMessages = Array.isArray(options.fallbackMessages)
    ? options.fallbackMessages
    : [];
  const formatErrorMessage = typeof options.formatErrorMessage === 'function'
    ? options.formatErrorMessage
    : (_reason, fallback) => fallback;

  return formatErrorMessage(
    settled[rejectedIndex]?.reason,
    fallbackMessages[rejectedIndex]
      || options.fallbackMessage
      || '加载系统配置失败，请稍后重试',
  );
}

export async function runSettledTaskGroup(taskFactories = [], options = {}) {
  const tasks = normalizeTaskFactories(taskFactories);
  const results = await Promise.allSettled(tasks.map((task) => task()));
  return {
    results,
    errorMessage: resolveSettledTaskGroupError(results, options),
  };
}
