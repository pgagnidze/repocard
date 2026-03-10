import type { CardData, CardSize, CardStyle } from '../types.ts'

import { renderDetailed } from './detailed.ts'
import { renderMinimal } from './minimal.ts'

const renderers: Record<CardStyle, (data: CardData, size: CardSize) => string> = {
  minimal: renderMinimal,
  detailed: renderDetailed,
}

export function renderCard(data: CardData, style: CardStyle, size: CardSize): string {
  const render = renderers[style]
  return render(data, size)
}
