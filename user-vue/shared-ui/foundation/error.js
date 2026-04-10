import { pickFirstDefined, readValue } from './safe.js'

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeErrorMessage(error, fallback = '操作失败，请稍后重试') {
  const message = pickFirstDefined(
    readValue(error, ['data', 'error'], ''),
    readValue(error, ['data', 'message'], ''),
    readValue(error, ['error'], ''),
    readValue(error, ['message'], ''),
    readValue(error, ['errMsg'], '')
  )

  const text = normalizeText(message)
  return text || fallback
}

export function isHtmlDocumentPayload(payload) {
  return typeof payload === 'string' && payload.indexOf('<!DOCTYPE html>') !== -1
}
