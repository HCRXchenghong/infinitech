import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const convert = require('heic-convert')

export async function convertHeicFile({
  inputPath,
  outputPath = '',
  quality = 0.85,
  deleteSource = true,
} = {}) {
  const sourcePath = String(inputPath || '').trim()
  if (!sourcePath) {
    throw new Error('inputPath is required')
  }
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`input file not found: ${sourcePath}`)
  }

  const resolvedInputPath = path.resolve(sourcePath)
  const resolvedOutputPath = path.resolve(
    String(outputPath || '')
      .trim() || resolvedInputPath.replace(/\.(heic|heif)$/i, '.jpg'),
  )

  const inputBuffer = fs.readFileSync(resolvedInputPath)
  const outputBuffer = await convert({
    buffer: inputBuffer,
    format: 'JPEG',
    quality,
  })

  fs.mkdirSync(path.dirname(resolvedOutputPath), { recursive: true })
  fs.writeFileSync(resolvedOutputPath, Buffer.from(outputBuffer))

  if (deleteSource && resolvedOutputPath !== resolvedInputPath) {
    try {
      fs.unlinkSync(resolvedInputPath)
    } catch (_error) {
      // Ignore source cleanup failures.
    }
  }

  return {
    success: true,
    inputPath: resolvedInputPath,
    outputPath: resolvedOutputPath,
    filename: path.basename(resolvedOutputPath),
  }
}

async function runCli() {
  const inputPath = process.argv[2]
  const outputPath = process.argv[3]

  if (!inputPath) {
    console.error(JSON.stringify({ success: false, error: 'inputPath is required' }))
    process.exit(1)
  }

  try {
    const result = await convertHeicFile({ inputPath, outputPath })
    process.stdout.write(`${JSON.stringify(result)}\n`)
  } catch (error) {
    console.error(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
    )
    process.exit(1)
  }
}

const currentFilePath = fileURLToPath(import.meta.url)
const entryFilePath = process.argv[1] ? path.resolve(process.argv[1]) : ''

if (entryFilePath && currentFilePath === entryFilePath) {
  await runCli()
}
