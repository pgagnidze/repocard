import type { CardData, CardSize, CardStyle } from './types.ts'

import { Resvg } from '@resvg/resvg-js'
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { CARD_DIMENSIONS } from './types.ts'
import { renderCard } from './cards/index.ts'

const RENDER_SCALE = 2

export interface RenderResult {
  svg: string
  png: Buffer
  width: number
  height: number
}

export async function generateCard(data: CardData, style: CardStyle, size: CardSize): Promise<RenderResult> {
  const svg = renderCard(data, style, size)
  const { width, height } = CARD_DIMENSIONS[size]

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width * RENDER_SCALE },
    font: {
      loadSystemFonts: true,
    },
    background: 'rgba(0, 0, 0, 0)',
  })

  const rendered = resvg.render()
  const png = rendered.asPng()

  return { svg, png: Buffer.from(png), width: width * RENDER_SCALE, height: height * RENDER_SCALE }
}

export async function saveCard(result: RenderResult, outputPath: string): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, result.png)
}

export async function saveSvg(svg: string, outputPath: string): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, svg, 'utf-8')
}
