import type { CardData, CardSize } from '../types.ts'

import { escapeXml, formatCount, timeAgo, truncate } from '../format.ts'
import { CARD_DIMENSIONS, LANGUAGE_COLORS } from '../types.ts'
import {
  COLORS,
  FONTS,
  forkSvg,
  healthDots,
  languageBar,
  sparkline,
  starSvg,
  topicPills,
  versionBadge,
} from './shared.ts'

function buildLangLegend(topLangs: [string, number][], totalBytes: number, pad: number, legendY: number): string {
  let legendX = 0
  return topLangs
    .map(([lang, bytes]) => {
      const pct = ((bytes / totalBytes) * 100).toFixed(1)
      const color = LANGUAGE_COLORS[lang] ?? COLORS.textMuted
      const item = `
      <circle cx="${pad + legendX + 5}" cy="${legendY + 5}" r="3.5" fill="${color}"/>
      <text x="${pad + legendX + 14}" y="${legendY + 9}" font-family="${FONTS.sans}" font-size="11" fill="${COLORS.textMuted}">${escapeXml(lang)} ${pct}%</text>`
      legendX += 14 + (lang.length + pct.length + 2) * 6.2 + 16
      return item
    })
    .join('\n')
}

function renderBanner(data: CardData): string {
  const { width, height } = CARD_DIMENSIONS.banner
  const { repo, languages, commitActivity, release, health } = data
  const pad = 40
  const contentWidth = width - pad * 2
  const splitX = Math.floor(width * 0.48)
  const leftWidth = splitX - pad - 20

  const description = truncate(repo.description, 90)
  const stars = formatCount(repo.stars)
  const forks = formatCount(repo.forks)
  const pushed = timeAgo(repo.pushedAt)
  const primaryLang = repo.language
  const langColor = primaryLang ? (LANGUAGE_COLORS[primaryLang] ?? COLORS.textMuted) : null

  const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0)
  const topLangs = Object.entries(languages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)

  const hasDesc = description.length > 0
  const hasTopics = repo.topics.length > 0
  const hasHealth = health != null
  const hasActivity = commitActivity.length > 0

  const ownerY = pad + 10
  const nameY = ownerY + 30
  const descY = nameY + 22
  const topicsY = hasDesc ? descY + 24 : nameY + 34
  const statsY = hasTopics ? topicsY + 32 : topicsY

  const bottomY = height - pad
  const langBarHeight = 6
  const langBarY = bottomY - 30
  const legendY = langBarY + langBarHeight + 8
  const healthY = bottomY - 4

  const sparkX = splitX + 10
  const sparkWidth = width - pad - sparkX
  const sparkTopY = ownerY + 14
  const sparkHeight = langBarY - sparkTopY - 20

  const langLegend = buildLangLegend(topLangs, totalBytes, pad, legendY)

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="d-bg" x1="0" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="#0f1520"/>
      <stop offset="100%" stop-color="#0a0e14"/>
    </linearGradient>
    <linearGradient id="d-accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${COLORS.accent}"/>
      <stop offset="100%" stop-color="${COLORS.accent}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="d-divider" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${COLORS.cardBorder}" stop-opacity="0"/>
      <stop offset="20%" stop-color="${COLORS.cardBorder}"/>
      <stop offset="80%" stop-color="${COLORS.cardBorder}"/>
      <stop offset="100%" stop-color="${COLORS.cardBorder}" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="d-card-clip">
      <rect width="${width}" height="${height}" rx="16"/>
    </clipPath>
  </defs>

  <rect width="${width}" height="${height}" rx="16" fill="url(#d-bg)"/>
  <rect width="${width}" height="${height}" rx="16" fill="none" stroke="${COLORS.cardBorder}" stroke-width="1"/>
  <rect x="0" y="0" width="${width}" height="3" fill="url(#d-accent)" clip-path="url(#d-card-clip)"/>

  <text x="${pad}" y="${ownerY}" font-family="${FONTS.mono}" font-size="12" fill="${COLORS.textMuted}" letter-spacing="0.5">${escapeXml(repo.owner.login)}${repo.archived ? ' / ARCHIVED' : ''}</text>

  <text x="${pad}" y="${nameY}" font-family="${FONTS.sans}" font-size="24" fill="${COLORS.text}" font-weight="700" letter-spacing="-0.5">${escapeXml(repo.name)}</text>
  ${release ? versionBadge(release.tagName, pad + repo.name.length * 13.5 + 14, nameY - 15, release.prerelease) : ''}

  ${hasDesc ? `<text x="${pad}" y="${descY}" font-family="${FONTS.sans}" font-size="13" fill="${COLORS.textSecondary}" letter-spacing="0.2">${escapeXml(description)}</text>` : ''}

  ${hasTopics ? topicPills(repo.topics, pad, topicsY, leftWidth) : ''}

  <g transform="translate(${pad}, ${statsY})">
    <g>
      ${starSvg(0.65)}
      <text x="14" y="9" font-family="${FONTS.mono}" font-size="14" fill="${COLORS.text}" font-weight="600">${stars}</text>
    </g>
    <g transform="translate(${14 + stars.length * 9 + 20}, 0)">
      ${forkSvg(0.65)}
      <text x="12" y="9" font-family="${FONTS.mono}" font-size="14" fill="${COLORS.textSecondary}">${forks}</text>
    </g>
    ${
      primaryLang && langColor
        ? `
    <g transform="translate(${14 + stars.length * 9 + 20 + 12 + forks.length * 9 + 20}, 0)">
      <circle cx="5" cy="5" r="4" fill="${langColor}"/>
      <text x="14" y="9" font-family="${FONTS.sans}" font-size="12" fill="${COLORS.textSecondary}">${escapeXml(primaryLang)}</text>
    </g>`
        : ''
    }
  </g>

  <text x="${pad}" y="${statsY + 28}" font-family="${FONTS.mono}" font-size="11" fill="${COLORS.textMuted}">${pushed}</text>

  <line x1="${splitX}" y1="${ownerY - 4}" x2="${splitX}" y2="${langBarY - 10}" stroke="url(#d-divider)" stroke-width="1"/>

  <text x="${sparkX}" y="${ownerY}" font-family="${FONTS.mono}" font-size="10" fill="${COLORS.textMuted}" letter-spacing="1">COMMIT ACTIVITY</text>
  ${hasActivity ? sparkline(commitActivity, sparkX, sparkTopY, sparkWidth, sparkHeight, COLORS.accent) : ''}

  <line x1="${pad}" y1="${langBarY - 8}" x2="${width - pad}" y2="${langBarY - 8}" stroke="${COLORS.cardBorder}" stroke-width="1"/>
  ${languageBar(languages, pad, langBarY, contentWidth, langBarHeight)}
  ${langLegend}

  ${hasHealth ? healthDots(health.hasReadme, health.hasContributing, health.hasCodeOfConduct, health.hasLicense, pad, healthY) : ''}
  ${repo.license ? `<text x="${width - pad}" y="${healthY + 9}" font-family="${FONTS.mono}" font-size="11" fill="${COLORS.textMuted}" text-anchor="end">${escapeXml(repo.license)}</text>` : ''}
</svg>`
}

function renderDefault(data: CardData, size: CardSize): string {
  const { width, height } = CARD_DIMENSIONS[size]
  const { repo, languages, commitActivity, release, health, readmeStats } = data
  const pad = 32
  const contentWidth = width - pad * 2
  const isLandscape = size === 'landscape'

  const description = truncate(repo.description, isLandscape ? 100 : 160)
  const stars = formatCount(repo.stars)
  const forks = formatCount(repo.forks)
  const pushed = timeAgo(repo.pushedAt)
  const primaryLang = repo.language
  const langColor = primaryLang ? (LANGUAGE_COLORS[primaryLang] ?? COLORS.textMuted) : null

  const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0)
  const topLangs = Object.entries(languages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, isLandscape ? 4 : 5)

  const hasDesc = description.length > 0
  const hasTopics = repo.topics.length > 0
  const hasHealth = health != null
  const hasActivity = commitActivity.length > 0

  const ownerY = pad + 10
  const nameY = ownerY + 28
  const descY = nameY + 20
  const topicsY = hasDesc ? descY + 22 : nameY + 30
  const statsY = hasTopics ? topicsY + 38 : topicsY

  const bottomY = height - pad
  const healthY = bottomY - 6
  const langBarHeight = 6
  const legendY = healthY - 24
  const langBarY = legendY - langBarHeight - 10
  const dividerY = langBarY - 10

  const sparkY = statsY + 32
  const sparkHeight = Math.max(dividerY - sparkY - 12, 20)
  const sparkWidth = contentWidth

  const langLegend = buildLangLegend(topLangs, totalBytes, pad, legendY)

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="d-bg" x1="0" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="#0f1520"/>
      <stop offset="100%" stop-color="#0a0e14"/>
    </linearGradient>
    <linearGradient id="d-accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${COLORS.accent}"/>
      <stop offset="100%" stop-color="${COLORS.accent}" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="d-card-clip">
      <rect width="${width}" height="${height}" rx="16"/>
    </clipPath>
  </defs>

  <rect width="${width}" height="${height}" rx="16" fill="url(#d-bg)"/>
  <rect width="${width}" height="${height}" rx="16" fill="none" stroke="${COLORS.cardBorder}" stroke-width="1"/>
  <rect x="0" y="0" width="${width}" height="3" fill="url(#d-accent)" clip-path="url(#d-card-clip)"/>

  <text x="${pad}" y="${ownerY}" font-family="${FONTS.mono}" font-size="12" fill="${COLORS.textMuted}" letter-spacing="0.5">${escapeXml(repo.owner.login)}${repo.archived ? ' / ARCHIVED' : ''}</text>
  <text x="${width - pad}" y="${ownerY}" font-family="${FONTS.mono}" font-size="11" fill="${COLORS.textMuted}" text-anchor="end">${pushed}</text>

  <text x="${pad}" y="${nameY}" font-family="${FONTS.sans}" font-size="24" fill="${COLORS.text}" font-weight="700" letter-spacing="-0.5">${escapeXml(repo.name)}</text>
  ${release ? versionBadge(release.tagName, pad + repo.name.length * 13.5 + 14, nameY - 18, release.prerelease) : ''}

  ${hasDesc ? `<text x="${pad}" y="${descY}" font-family="${FONTS.sans}" font-size="13" fill="${COLORS.textSecondary}" letter-spacing="0.2">${escapeXml(description)}</text>` : ''}

  ${hasTopics ? topicPills(repo.topics, pad, topicsY, contentWidth) : ''}

  <g transform="translate(${pad}, ${statsY})">
    <g transform="translate(0, -1)">
      ${starSvg(0.65)}
    </g>
    <text x="14" y="10" font-family="${FONTS.mono}" font-size="14" fill="${COLORS.text}" font-weight="600">${stars}</text>
    <g transform="translate(${14 + stars.length * 9 + 20}, 0)">
      <g transform="translate(0, -1)">
        ${forkSvg(0.65)}
      </g>
      <text x="12" y="10" font-family="${FONTS.mono}" font-size="14" fill="${COLORS.textSecondary}">${forks}</text>
    </g>
    ${
      primaryLang && langColor
        ? `
    <g transform="translate(${14 + stars.length * 9 + 20 + 12 + forks.length * 9 + 20}, 0)">
      <circle cx="5" cy="6" r="4" fill="${langColor}"/>
      <text x="14" y="10" font-family="${FONTS.sans}" font-size="12" fill="${COLORS.textSecondary}">${escapeXml(primaryLang)}</text>
    </g>`
        : ''
    }
  </g>

  ${
    readmeStats
      ? `<text x="${width - pad}" y="${statsY + 10}" font-family="${FONTS.mono}" font-size="10" text-anchor="end">
        <tspan fill="${COLORS.textMuted}" font-size="9">README </tspan><tspan fill="${COLORS.textMuted}"> em-dash </tspan><tspan fill="${COLORS.textSecondary}" font-weight="600">${readmeStats.emDashCount}</tspan>
        <tspan fill="${COLORS.textMuted}">   emoji </tspan><tspan fill="${COLORS.textSecondary}" font-weight="600">${readmeStats.emojiCount}</tspan>
      </text>`
      : ''
  }

  ${
    hasActivity
      ? `
  <text x="${pad}" y="${sparkY - 8}" font-family="${FONTS.mono}" font-size="9" fill="${COLORS.textMuted}" letter-spacing="1">COMMIT ACTIVITY (6 MO)</text>
  ${sparkline(commitActivity, pad, sparkY, sparkWidth, sparkHeight, COLORS.accent)}`
      : ''
  }

  <line x1="${pad}" y1="${dividerY}" x2="${width - pad}" y2="${dividerY}" stroke="${COLORS.cardBorder}" stroke-width="1"/>
  ${languageBar(languages, pad, langBarY, contentWidth, langBarHeight)}
  ${langLegend}

  ${hasHealth ? healthDots(health.hasReadme, health.hasContributing, health.hasCodeOfConduct, health.hasLicense, pad, healthY) : ''}
  ${repo.license ? `<text x="${width - pad}" y="${healthY + 9}" font-family="${FONTS.mono}" font-size="10" fill="${COLORS.textMuted}" text-anchor="end">${escapeXml(repo.license)}</text>` : ''}
</svg>`
}

export function renderDetailed(data: CardData, size: CardSize): string {
  if (size === 'banner') {
    return renderBanner(data)
  }
  return renderDefault(data, size)
}
