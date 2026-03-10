import type { CardSize, CardStyle } from './types.ts'

import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { parseArgs, styleText } from 'node:util'
import { fetchCardData, parseRepoInput } from './github.ts'
import { generateCard, saveCard, saveSvg } from './render.ts'

const VALID_STYLES: CardStyle[] = ['minimal', 'detailed']
const VALID_SIZES: CardSize[] = ['landscape', 'square', 'banner']

function showHelp(): void {
  console.log(`
${styleText('bold', 'gh-card')} — Generate beautiful social media cards for GitHub repos

${styleText('bold', 'USAGE')}
  gh-card generate <owner/repo> [options]
  gh-card batch <file.json> [options]

${styleText('bold', 'COMMANDS')}
  generate    Generate a card for a single repository
  batch       Generate cards for multiple repos from a JSON file

${styleText('bold', 'OPTIONS')}
  --style     Card style: minimal, detailed         (default: minimal)
  --size      Output size: landscape, square, banner (default: landscape)
  --out       Output file path                      (overrides --out-dir)
  --out-dir   Output directory                      (default: ./output)
  --svg       Also save the SVG source
  --token     GitHub API token for higher rate limits
  --all       Generate all styles at once
  --help      Show this help message

${styleText('bold', 'EXAMPLES')}
  gh-card generate facebook/react
  gh-card generate facebook/react --style detailed --size square
  gh-card generate facebook/react --all --out-dir ./cards
  gh-card batch repos.json --style detailed --out-dir ./cards
`)
}

async function generateSingle(
  repoInput: string,
  style: CardStyle,
  size: CardSize,
  outputPath: string | undefined,
  outDir: string,
  shouldSaveSvg: boolean,
  token: string | undefined,
): Promise<void> {
  const { owner, repo } = parseRepoInput(repoInput)

  console.log(styleText('blue', `Fetching ${owner}/${repo}...`))
  const data = await fetchCardData(owner, repo, token, style)

  console.log(styleText('blue', `Rendering ${style} card...`))
  const result = await generateCard(data, style, size)

  const outFile = outputPath ?? join(outDir, `${repo}-${style}.png`)
  await saveCard(result, outFile)
  console.log(styleText('green', `✓ Saved ${outFile} (${result.width}×${result.height})`))

  if (shouldSaveSvg) {
    const svgFile = outFile.replace(/\.png$/, '.svg')
    await saveSvg(result.svg, svgFile)
    console.log(styleText('green', `✓ Saved ${svgFile}`))
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

  console.log(styleText('blue', `Fetching ${owner}/${repo}...`))
  const data = await fetchCardData(owner, repo, token)

  for (const style of VALID_STYLES) {
    console.log(styleText('blue', `Rendering ${style} card...`))
    const result = await generateCard(data, style, size)

    const outFile = join(outDir, `${repo}-${style}.png`)
    await saveCard(result, outFile)
    console.log(styleText('green', `✓ Saved ${outFile} (${result.width}×${result.height})`))

    if (shouldSaveSvg) {
      const svgFile = outFile.replace(/\.png$/, '.svg')
      await saveSvg(result.svg, svgFile)
      console.log(styleText('green', `✓ Saved ${svgFile}`))
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

  console.log(styleText('blue', `Processing ${entries.length} repos...`))

  for (const entry of entries) {
    const style = entry.style ?? defaultStyle
    try {
      const { owner, repo } = parseRepoInput(entry.repo)
      const data = await fetchCardData(owner, repo, token, style)
      const result = await generateCard(data, style, size)
      const outFile = join(outDir, `${repo}-${style}.png`)
      await saveCard(result, outFile)
      console.log(styleText('green', `✓ ${entry.repo} → ${outFile}`))

      if (shouldSaveSvg) {
        const svgFile = outFile.replace(/\.png$/, '.svg')
        await saveSvg(result.svg, svgFile)
      }
    } catch (err) {
      console.error(styleText('red', `✗ ${entry.repo}: ${err instanceof Error ? err.message : String(err)}`))
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
      help: { type: 'boolean', default: false },
    },
  })

  if (values.help || positionals.length === 0) {
    showHelp()
    process.exit(0)
  }

  const command = positionals[0]
  const style = values.style as CardStyle
  const size = values.size as CardSize

  if (!VALID_STYLES.includes(style)) {
    console.error(styleText('red', `Invalid style: ${style}. Use: ${VALID_STYLES.join(', ')}`))
    process.exit(1)
  }

  if (!VALID_SIZES.includes(size)) {
    console.error(styleText('red', `Invalid size: ${size}. Use: ${VALID_SIZES.join(', ')}`))
    process.exit(1)
  }

  if (command === 'generate') {
    const repoInput = positionals[1]
    if (!repoInput) {
      console.error(styleText('red', 'Missing repo argument. Usage: gh-card generate owner/repo'))
      process.exit(1)
    }

    if (values.all) {
      await generateAll(repoInput, size, values['out-dir']!, values.svg!, values.token)
    } else {
      await generateSingle(repoInput, style, size, values.out, values['out-dir']!, values.svg!, values.token)
    }
  } else if (command === 'batch') {
    const filePath = positionals[1]
    if (!filePath) {
      console.error(styleText('red', 'Missing file argument. Usage: gh-card batch repos.json'))
      process.exit(1)
    }
    await batchGenerate(filePath, style, size, values['out-dir']!, values.svg!, values.token)
  } else {
    console.error(styleText('red', `Unknown command: ${command}`))
    showHelp()
    process.exit(1)
  }
}

main().catch((err: unknown) => {
  console.error(styleText('red', err instanceof Error ? err.message : String(err)))
  process.exit(1)
})
