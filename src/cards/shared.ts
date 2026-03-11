import type { LanguageBreakdown } from '../types.ts'

import { escapeXml } from '../format.ts'
import { LANGUAGE_COLORS } from '../types.ts'

export const COLORS = {
  bg: '#0a0e14',
  cardBg: '#111827',
  cardBorder: '#1e293b',
  text: '#e2e8f0',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  accent: '#3b82f6',
  accentLight: '#60a5fa',
  accentDark: '#1e40af',
  accentBg: 'rgba(59, 130, 246, 0.1)',
  success: '#22c55e',
  warning: '#f59e0b',
} as const

export const FONTS = {
  sans: 'Comfortaa, Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  mono: "Comfortaa, 'JetBrains Mono', 'Fira Code', monospace",
} as const

export function sparkline(
  data: number[],
  x: number,
  y: number,
  width: number,
  height: number,
  color = COLORS.accent,
): string {
  if (data.length === 0) {
    return ''
  }

  const maxVal = Math.max(...data, 1)
  const gap = 1.5
  const barWidth = (width - gap * (data.length - 1)) / data.length

  return data
    .map((value, i) => {
      const barHeight = Math.max((value / maxVal) * height, 1)
      const barX = x + i * (barWidth + gap)
      const barY = y + height - barHeight
      const opacity = 0.3 + (value / maxVal) * 0.7
      return `<rect x="${barX.toFixed(1)}" y="${barY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="1.5" fill="${color}" opacity="${opacity.toFixed(2)}"/>`
    })
    .join('\n')
}

export function versionBadge(tagName: string, x: number, y: number, prerelease = false): string {
  const color = prerelease ? COLORS.warning : COLORS.success
  const textWidth = tagName.length * 7.5 + 20

  return `
    <rect x="${x}" y="${y}" width="${textWidth}" height="22" rx="11" fill="${color}" opacity="0.12"/>
    <rect x="${x}" y="${y}" width="${textWidth}" height="22" rx="11" fill="none" stroke="${color}" stroke-width="1" opacity="0.4"/>
    <text x="${x + textWidth / 2}" y="${y + 15}" font-family="${FONTS.mono}" font-size="11" fill="${color}" text-anchor="middle" font-weight="500">${escapeXml(tagName)}</text>`
}

export function healthDots(
  hasReadme: boolean,
  hasContributing: boolean,
  hasCodeOfConduct: boolean,
  hasLicense: boolean,
  x: number,
  y: number,
): string {
  const items = [
    { label: 'Readme', has: hasReadme },
    { label: 'Contributing', has: hasContributing },
    { label: 'Conduct', has: hasCodeOfConduct },
    { label: 'License', has: hasLicense },
  ]

  let offsetX = 0
  return items
    .map((item) => {
      const dotColor = item.has ? COLORS.success : COLORS.textMuted
      const dotOpacity = item.has ? '0.8' : '0.3'
      const result = `
      <circle cx="${x + offsetX + 4}" cy="${y + 5}" r="3" fill="${dotColor}" opacity="${dotOpacity}"/>
      <text x="${x + offsetX + 12}" y="${y + 9}" font-family="${FONTS.mono}" font-size="9" fill="${COLORS.textMuted}" letter-spacing="0.3">${item.label}</text>`
      offsetX += 12 + item.label.length * 5.5 + 12
      return result
    })
    .join('\n')
}

export function languageBar(languages: LanguageBreakdown, x: number, y: number, width: number, height = 6): string {
  const total = Object.values(languages).reduce((a, b) => a + b, 0)
  if (total === 0) {
    return ''
  }

  const entries = Object.entries(languages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)

  let offsetX = 0
  const radius = height / 2

  const bars = entries.map(([lang, bytes]) => {
    const pct = bytes / total
    const barWidth = Math.max(pct * width, 2)
    const color = LANGUAGE_COLORS[lang] ?? COLORS.textMuted
    const bar = `<rect x="${x + offsetX}" y="${y}" width="${barWidth}" height="${height}" fill="${color}"/>`
    offsetX += barWidth
    return bar
  })

  const clipId = `lang-clip-${x}-${y}`
  return `
    <defs>
      <clipPath id="${clipId}">
        <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}"/>
      </clipPath>
    </defs>
    <g clip-path="url(#${clipId})">
      ${bars.join('\n')}
    </g>`
}

export function topicPills(topics: string[], x: number, y: number, maxWidth: number): string {
  if (topics.length === 0) {
    return ''
  }

  let offsetX = 0
  const pills: string[] = []

  for (const topic of topics.slice(0, 8)) {
    const textWidth = topic.length * 7 + 16
    if (offsetX + textWidth > maxWidth) {
      break
    }

    pills.push(`
      <rect x="${x + offsetX}" y="${y}" width="${textWidth}" height="24" rx="12" fill="${COLORS.accentBg}" stroke="${COLORS.accentDark}" stroke-width="1"/>
      <text x="${x + offsetX + textWidth / 2}" y="${y + 16}" font-family="${FONTS.sans}" font-size="11" fill="${COLORS.accentLight}" text-anchor="middle" letter-spacing="0.5">${escapeXml(topic)}</text>
    `)
    offsetX += textWidth + 8
  }

  return pills.join('\n')
}

export function starSvg(scale = 0.8): string {
  return `<path d="M10 1.5l2.47 5.01L18 7.27l-4 3.9.94 5.51L10 14.14l-4.94 2.54L6 11.17l-4-3.9 5.53-.76L10 1.5z" fill="${COLORS.warning}" opacity="0.85" transform="scale(${scale})"/>`
}

export function forkSvg(scale = 0.8): string {
  return `<path d="M5 3a2 2 0 0 1 4 0 2 2 0 0 1-1.73 2H7v2.27L9.73 9A2 2 0 1 1 9 10.73V9L7 7 5 9v1.73A2 2 0 1 1 3.27 9L6 7.27V5H5.73A2 2 0 0 1 5 3z" fill="none" stroke="${COLORS.textSecondary}" stroke-width="1.3" transform="scale(${scale})"/>`
}
