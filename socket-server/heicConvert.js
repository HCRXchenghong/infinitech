import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { logger } from './logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function resolveHeicCliPath() {
  const candidates = [
    resolve(__dirname, '..', 'heic-converter', 'index.js'),
    resolve(__dirname, 'heic-converter', 'index.js'),
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  return ''
}

function runNodeCli(scriptPath, inputPath, outputPath) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [scriptPath, inputPath, outputPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const stdout = []
    const stderr = []

    child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)))
    child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)))
    child.on('error', rejectPromise)
    child.on('close', (code) => {
      if (code !== 0) {
        rejectPromise(
          new Error(
            Buffer.concat(stderr).toString('utf8').trim()
              || Buffer.concat(stdout).toString('utf8').trim()
              || `heic conversion exited with code ${code}`,
          ),
        )
        return
      }

      const raw = Buffer.concat(stdout).toString('utf8').trim()
      if (!raw) {
        rejectPromise(new Error('empty HEIC conversion result'))
        return
      }

      try {
        resolvePromise(JSON.parse(raw))
      } catch (error) {
        rejectPromise(new Error(`invalid HEIC conversion response: ${error.message}`))
      }
    })
  })
}

export async function convertHeicFile(filePath) {
  const scriptPath = resolveHeicCliPath()
  if (!scriptPath) {
    throw new Error('local HEIC converter CLI not found')
  }

  const outputPath = filePath.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg')
  const result = await runNodeCli(scriptPath, filePath, outputPath)
  return result?.outputPath || outputPath
}

export async function convertHeicIfNeeded(filePath, ext) {
  const normalizedExt = String(ext || '').trim().toLowerCase()
  if (normalizedExt !== '.heic' && normalizedExt !== '.heif') {
    return filePath
  }

  try {
    const convertedPath = await convertHeicFile(filePath)
    logger.info(`HEIC converted locally: ${filePath} -> ${convertedPath}`)
    return convertedPath
  } catch (error) {
    logger.error('HEIC local conversion failed:', error?.message || error)
    throw error
  }
}
