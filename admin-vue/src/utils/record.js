export function hasValidPrimaryKey(item) {
  return item && typeof item === 'object' && item.id !== undefined && item.id !== null && item.id !== '';
}
