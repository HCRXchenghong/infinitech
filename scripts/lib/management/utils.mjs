import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

export function isInteractive() {
  return Boolean(input.isTTY && output.isTTY)
}

export function maskSecret(value, options = {}) {
  const text = String(value || '')
  if (!text) {
    return ''
  }
  if (options.reveal) {
    return text
  }
  if (text.length <= 6) {
    return '*'.repeat(text.length)
  }
  return `${text.slice(0, 2)}***${text.slice(-2)}`
}

export function normalizeDomain(value) {
  return String(value || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
}

export function normalizeBoolean(value, fallback = false) {
  const text = String(value ?? '').trim().toLowerCase()
  if (!text) {
    return fallback
  }
  return text === '1' || text === 'true' || text === 'yes' || text === 'on'
}

export function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: options.stdio || 'pipe',
    shell: false,
    input: options.input,
    encoding: 'utf8',
  })

  return {
    status: result.status ?? 1,
    stdout: String(result.stdout || ''),
    stderr: String(result.stderr || ''),
    error: result.error || null,
  }
}

export function runCommandOrThrow(command, args, options = {}) {
  const result = runCommand(command, args, options)
  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    const detail = [result.stderr.trim(), result.stdout.trim()].filter(Boolean).join('\n')
    throw new Error(detail || `command failed: ${command} ${args.join(' ')}`)
  }
  return result
}

export async function promptText(question, fallback = '') {
  const rl = createInterface({ input, output })
  try {
    const suffix = fallback ? ` [${fallback}]` : ''
    const answer = await rl.question(`${question}${suffix}: `)
    return String(answer || fallback).trim()
  } finally {
    rl.close()
  }
}

export async function promptChoice(question, options, fallbackIndex = 0) {
  console.log(`\n${question}`)
  options.forEach((option, index) => {
    console.log(`  ${index + 1}. ${option}`)
  })
  const fallback = String(fallbackIndex + 1)
  const answer = await promptText('输入数字选项', fallback)
  const numeric = Number(answer)
  if (!Number.isFinite(numeric) || numeric < 1 || numeric > options.length) {
    return fallbackIndex
  }
  return numeric - 1
}

export async function promptConfirm(question, fallback = false) {
  const answer = await promptText(question, fallback ? 'y' : 'n')
  return normalizeBoolean(answer, fallback)
}

export async function promptExact(question, requiredText) {
  const answer = await promptText(question, '')
  return answer === requiredText
}

export function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true })
  return directoryPath
}

export function timestampLabel(now = new Date()) {
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ]
  return parts.join('')
}

export function formatKeyValues(rows) {
  const entries = rows.filter((row) => row && row.label)
  const width = entries.reduce((max, row) => Math.max(max, row.label.length), 0)
  return entries.map((row) => `${row.label.padEnd(width, ' ')} : ${row.value}`).join('\n')
}

export async function checkPortAvailable(port) {
  const numeric = Number(port)
  if (!Number.isInteger(numeric) || numeric <= 0 || numeric > 65535) {
    return false
  }

  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => {
      server.close(() => resolve(true))
    })
    server.listen(numeric, '0.0.0.0')
  })
}

export async function checkPortReachable(port, host = '127.0.0.1', timeoutMs = 500) {
  const numeric = Number(port)
  if (!Number.isInteger(numeric) || numeric <= 0 || numeric > 65535) {
    return false
  }

  return new Promise((resolve) => {
    const socket = net.createConnection({
      host,
      port: numeric,
    })

    const finish = (value) => {
      socket.removeAllListeners()
      socket.destroy()
      resolve(value)
    }

    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

export async function checkPortInUse(port) {
  const [reachable, bindAvailable] = await Promise.all([
    checkPortReachable(port),
    checkPortAvailable(port),
  ])
  return reachable || !bindAvailable
}

export function fileExists(filePath) {
  try {
    return fs.existsSync(filePath)
  } catch {
    return false
  }
}

export function resolveEditor() {
  const candidates = [process.env.VISUAL, process.env.EDITOR]
    .filter(Boolean)
    .map((value) => String(value).trim())
  if (process.platform === 'win32') {
    candidates.push('notepad.exe')
  } else {
    candidates.push('vi')
  }
  return candidates[0]
}

export function openFileInEditor(filePath) {
  const editor = resolveEditor()
  const result = spawnSync(editor, [filePath], {
    stdio: 'inherit',
    shell: process.platform === 'win32' && editor.toLowerCase().endsWith('.exe') === false,
  })
  if ((result.status ?? 1) !== 0) {
    throw new Error(`failed to open editor for ${path.basename(filePath)}`)
  }
}
