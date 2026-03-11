import type { CardData, CardSize } from '../types.ts'

import { escapeXml, formatCount, truncate } from '../format.ts'
import { CARD_DIMENSIONS, LANGUAGE_COLORS } from '../types.ts'
import { COLORS, FONTS, forkSvg, starSvg } from './shared.ts'

export function renderMinimal(data: CardData, size: CardSize): string {
  const { width, height } = CARD_DIMENSIONS[size]
  const { repo } = data
  const isBanner = size === 'banner'
  const isSquare = size === 'square'
  const pad = isBanner ? 56 : 36

  const primaryLang = repo.language
  const langColor = primaryLang ? (LANGUAGE_COLORS[primaryLang] ?? COLORS.accentLight) : COLORS.accent
  const stars = formatCount(repo.stars)
  const forks = formatCount(repo.forks)

  const maxDescLen = isBanner ? 80 : isSquare ? 140 : 90
  const description = truncate(repo.description, maxDescLen)

  const nameFontSize = isBanner
    ? repo.name.length > 20
      ? 34
      : repo.name.length > 14
        ? 42
        : 48
    : repo.name.length > 20
      ? 32
      : repo.name.length > 14
        ? 40
        : 48

  const nameY = isSquare ? height / 2 - 20 : height / 2 - 10
  const ownerY = pad
  const underlineY = nameY + 10
  const descY = nameY + (isBanner ? 38 : 44)
  const bottomY = height - pad - 10

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="m-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#080c12"/>
      <stop offset="50%" stop-color="#0a0e14"/>
      <stop offset="100%" stop-color="#0d1420"/>
    </linearGradient>
    <linearGradient id="m-name" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${COLORS.text}"/>
      <stop offset="100%" stop-color="${COLORS.accentLight}"/>
    </linearGradient>
    <linearGradient id="m-glow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${langColor}" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="${langColor}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="m-orb1" cx="0.8" cy="0.2" r="0.6">
      <stop offset="0%" stop-color="${langColor}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${langColor}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="m-orb2" cx="0.2" cy="0.8" r="0.5">
      <stop offset="0%" stop-color="${COLORS.accent}" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="${COLORS.accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="m-grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${COLORS.cardBorder}" stroke-width="0.5" opacity="0.3"/>
    </pattern>
  </defs>

  <rect width="${width}" height="${height}" rx="12" fill="url(#m-bg)"/>
  <rect width="${width}" height="${height}" rx="12" fill="url(#m-orb1)"/>
  <rect width="${width}" height="${height}" rx="12" fill="url(#m-orb2)"/>
  <rect width="${width}" height="${height}" rx="12" fill="url(#m-grid)" opacity="0.4"/>
  <rect width="${width}" height="${height}" rx="12" fill="none" stroke="${COLORS.cardBorder}" stroke-width="1"/>

  <text x="${pad}" y="${ownerY}" font-family="${FONTS.mono}" font-size="${isBanner ? 13 : 14}" fill="${COLORS.textMuted}" letter-spacing="1">${escapeXml(repo.owner.login)}</text>

  <text x="${pad}" y="${nameY}" font-family="${FONTS.sans}" font-size="${nameFontSize}" fill="url(#m-name)" font-weight="800" letter-spacing="-1">${escapeXml(repo.name)}</text>

  <rect x="${pad}" y="${underlineY}" width="60" height="3" rx="1.5" fill="${langColor}" opacity="0.8"/>

  ${description ? `<text x="${pad}" y="${descY}" font-family="${FONTS.sans}" font-size="${isBanner ? 14 : 16}" fill="${COLORS.textSecondary}" letter-spacing="0.3">${escapeXml(description)}</text>` : ''}

  <g transform="translate(${pad}, ${bottomY})">
    <g>
      ${starSvg(0.85)}
      <text x="20" y="6" font-family="${FONTS.mono}" font-size="16" fill="${COLORS.text}" font-weight="600">${stars}</text>
    </g>
    <g transform="translate(${20 + stars.length * 10 + 32}, 0)">
      ${forkSvg(0.85)}
      <text x="16" y="6" font-family="${FONTS.mono}" font-size="16" fill="${COLORS.textSecondary}">${forks}</text>
    </g>
    ${
      primaryLang
        ? `
    <g transform="translate(${width - pad * 2 - primaryLang.length * 8 - 40}, -10)">
      <rect x="0" y="0" width="${primaryLang.length * 8 + 32}" height="26" rx="13" fill="rgba(0,0,0,0.3)" stroke="${langColor}" stroke-width="1" opacity="0.8"/>
      <circle cx="14" cy="13" r="4" fill="${langColor}"/>
      <text x="24" y="17" font-family="${FONTS.sans}" font-size="13" fill="${COLORS.textSecondary}" font-weight="500">${escapeXml(primaryLang)}</text>
    </g>`
        : ''
    }
  </g>
</svg>`
}
