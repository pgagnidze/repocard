import type { CardSize, CardStyle } from './types.ts'

import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs, styleText } from 'node:util'
import { fetchCardData, parseRepoInput } from './github.ts'
import { generateCard, saveCard, saveSvg } from './render.ts'

function shouldUseColor(): boolean {
  if (process.env['NO_COLOR'] !== undefined) {
    return false
  }
  if (process.env['TERM'] === 'dumb') {
    return false
  }
  if (process.argv.includes('--no-color')) {
    return false
  }
  return process.stderr.isTTY === true
}

function style(format: string | string[], text: string): string {
  if (!shouldUseColor()) {
    return text
  }
  return styleText(format as Parameters<typeof styleText>[0], text)
}

function info(message: string): void {
  process.stderr.write(style('dim', `  ${message}`) + '\n')
}

function success(message: string): void {
  process.stderr.write(style('green', `  ${message}`) + '\n')
}

function error(message: string): void {
  process.stderr.write(style('red', `  ${message}`) + '\n')
}

function getVersion(): string {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url))
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')) as { version: string }
    const version = pkg.version ?? 'unknown'

    const buildInfo: string[] = []
    if (process.env.GITHUB_SHA) {
      buildInfo.push(`commit: ${process.env.GITHUB_SHA.substring(0, 7)}`)
    }
    if (process.env.BUILD_DATE) {
      buildInfo.push(`built: ${process.env.BUILD_DATE}`)
    }
    const suffix = buildInfo.length > 0 ? ` (${buildInfo.join(', ')})` : ''

    return `${version}${suffix}`
  } catch {
    return 'unknown'
  }
}

const VALID_STYLES: CardStyle[] = ['minimal', 'detailed']
const VALID_SIZES: CardSize[] = ['landscape', 'square', 'banner']

const HELP = `
                                       _
   _ __ ___ _ __   ___   ___ __ _ _ __| |
  | '__/ _ \\ '_ \\ / _ \\ / __/ _\` | '__| |
  | | |  __/ |_) | (_) | (_| (_| | |  |_|
  |_|  \\___|  __/ \\___/ \\___\\__,_|_|  (_)
            |_|
  Generate beautiful social media cards for GitHub repos.

  Usage:
    repocard generate <owner/repo>    Generate a card for a single repo
    repocard batch <file.json>        Generate cards from a JSON file

  Options:
    --style <style>       Card style: minimal, detailed   (default: minimal)
    --size <size>         Output size: landscape, square,  (default: landscape)
                          banner
    --out <path>          Output file path                 (overrides --out-dir)
    --out-dir <dir>       Output directory                 (default: ./output)
    --svg                 Also save the SVG source
    --token <token>       GitHub API token
    --all                 Generate all styles at once
    --no-color            Disable colors
    -h, --help            Show this help
    -v, --version         Show version

  Environment:
    GITHUB_TOKEN          GitHub token (alternative to --token)
    NO_COLOR              Disable colors (any value)

  Examples:
    npx repocard generate facebook/react
    npx repocard generate facebook/react --style detailed --size square
    npx repocard generate facebook/react --all --out-dir ./cards
    npx repocard batch repos.json --style detailed --out-dir ./cards
`

async function generateSingle(
  repoInput: string,
  cardStyle: CardStyle,
  size: CardSize,
  outputPath: string | undefined,
  outDir: string,
  shouldSaveSvg: boolean,
  token: string | undefined,
): Promise<void> {
  const { owner, repo } = parseRepoInput(repoInput)

  info(`Fetching ${owner}/${repo}...`)
  const data = await fetchCardData(owner, repo, token, cardStyle)

  info(`Rendering ${cardStyle} card...`)
  const result = await generateCard(data, cardStyle, size)

  const outFile = outputPath ?? join(outDir, `${repo}-${cardStyle}.png`)
  await saveCard(result, outFile)
  success(`Saved ${outFile} (${result.width}x${result.height})`)

  if (shouldSaveSvg) {
    const svgFile = outFile.replace(/\.png$/, '.svg')
    await saveSvg(result.svg, svgFile)
    success(`Saved ${svgFile}`)
  }
}

async function generateAll(
  repoInput: string,
  size: CardSize,
  outDir: string,
  shouldSaveSvg: boolean,
  token: string | undefined,
): Promise<void> {
  const { owner, repo } = parseRepoInput(repoInput)

  info(`Fetching ${owner}/${repo}...`)
  const data = await fetchCardData(owner, repo, token)

  for (const cardStyle of VALID_STYLES) {
    info(`Rendering ${cardStyle} card...`)
    const result = await generateCard(data, cardStyle, size)

    const outFile = join(outDir, `${repo}-${cardStyle}.png`)
    await saveCard(result, outFile)
    success(`Saved ${outFile} (${result.width}x${result.height})`)

    if (shouldSaveSvg) {
      const svgFile = outFile.replace(/\.png$/, '.svg')
      await saveSvg(result.svg, svgFile)
      success(`Saved ${svgFile}`)
    }
  }
}

interface BatchEntry {
  repo: string
  style?: CardStyle
}

async function batchGenerate(
  filePath: string,
  defaultStyle: CardStyle,
  size: CardSize,
  outDir: string,
  shouldSaveSvg: boolean,
  token: string | undefined,
): Promise<void> {
  const content = await readFile(resolve(filePath), 'utf-8')
  const entries = JSON.parse(content) as BatchEntry[]

  info(`Processing ${entries.length} repos...`)

  for (const entry of entries) {
    const cardStyle = entry.style ?? defaultStyle
    try {
      const { owner, repo } = parseRepoInput(entry.repo)
      const data = await fetchCardData(owner, repo, token, cardStyle)
      const result = await generateCard(data, cardStyle, size)
      const outFile = join(outDir, `${repo}-${cardStyle}.png`)
      await saveCard(result, outFile)
      success(`${entry.repo} -> ${outFile}`)

      if (shouldSaveSvg) {
        const svgFile = outFile.replace(/\.png$/, '.svg')
        await saveSvg(result.svg, svgFile)
      }
    } catch (err) {
      error(`${entry.repo}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      style: { type: 'string', default: 'minimal' },
      size: { type: 'string', default: 'landscape' },
      out: { type: 'string' },
      'out-dir': { type: 'string', default: './output' },
      svg: { type: 'boolean', default: false },
      token: { type: 'string', default: process.env.GITHUB_TOKEN },
      all: { type: 'boolean', default: false },
      'no-color': { type: 'boolean', default: false },
      version: { type: 'boolean', short: 'v', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  })

  if (values.version) {
    process.stdout.write(`repocard ${getVersion()}\n`)
    process.exit(0)
  }

  if (values.help || positionals.length === 0) {
    process.stdout.write(HELP)
    process.exit(0)
  }

  const command = positionals[0]
  const cardStyle = values.style as CardStyle
  const size = values.size as CardSize

  if (!VALID_STYLES.includes(cardStyle)) {
    error(`Invalid style: ${cardStyle}. Use: ${VALID_STYLES.join(', ')}`)
    process.exit(1)
  }

  if (!VALID_SIZES.includes(size)) {
    error(`Invalid size: ${size}. Use: ${VALID_SIZES.join(', ')}`)
    process.exit(1)
  }

  if (command === 'generate') {
    const repoInput = positionals[1]
    if (!repoInput) {
      error('Missing repo argument. Usage: repocard generate owner/repo')
      process.exit(1)
    }

    if (values.all) {
      await generateAll(repoInput, size, values['out-dir']!, values.svg!, values.token)
    } else {
      await generateSingle(repoInput, cardStyle, size, values.out, values['out-dir']!, values.svg!, values.token)
    }
  } else if (command === 'batch') {
    const filePath = positionals[1]
    if (!filePath) {
      error('Missing file argument. Usage: repocard batch repos.json')
      process.exit(1)
    }
    await batchGenerate(filePath, cardStyle, size, values['out-dir']!, values.svg!, values.token)
  } else {
    error(`Unknown command: ${command}`)
    process.stdout.write(HELP)
    process.exit(1)
  }
}

main().catch((err: unknown) => {
  error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
