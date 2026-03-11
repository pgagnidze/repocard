import type {
  CardData,
  CardStyle,
  CommunityHealth,
  LanguageBreakdown,
  ReadmeStats,
  ReleaseInfo,
  RepoData,
} from './types.ts'

const API_BASE = 'https://api.github.com'
const RETRY_DELAY_MS = 3000
const API_MAX_RETRIES = 3
const STATS_MAX_RETRIES = 10

const RETRYABLE_STATUSES = new Set([500, 503])

function buildHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface FetchOptions {
  maxRetries: number
  retryOn202?: boolean
}

async function fetchWithRetry(path: string, token: string | undefined, opts: FetchOptions): Promise<Response | null> {
  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      const response = await fetch(`${API_BASE}${path}`, { headers: buildHeaders(token) })
      const shouldRetry = RETRYABLE_STATUSES.has(response.status) || (opts.retryOn202 && response.status === 202)

      if (shouldRetry && attempt < opts.maxRetries - 1) {
        await sleep(RETRY_DELAY_MS)
        continue
      }

      return response
    } catch {
      if (attempt < opts.maxRetries - 1) {
        await sleep(RETRY_DELAY_MS)
        continue
      }
      return null
    }
  }
  return null
}

async function apiFetch<T>(path: string, token?: string): Promise<T> {
  const response = await fetchWithRetry(path, token, { maxRetries: API_MAX_RETRIES })

  if (!response) {
    throw new Error(`GitHub API failed after ${API_MAX_RETRIES} retries for ${path}`)
  }

  if (!response.ok) {
    const remaining = response.headers.get('X-RateLimit-Remaining')
    if (response.status === 403 && remaining === '0') {
      const reset = response.headers.get('X-RateLimit-Reset')
      const resetDate = reset ? new Date(Number(reset) * 1000).toLocaleTimeString() : 'unknown'
      throw new Error(`GitHub API rate limit exceeded. Resets at ${resetDate}. Use --token for higher limits.`)
    }
    throw new Error(`GitHub API error: ${response.status} ${response.statusText} for ${path}`)
  }

  return response.json() as Promise<T>
}

async function apiFetchWithRetry<T>(path: string, token?: string): Promise<T | null> {
  const response = await fetchWithRetry(path, token, { maxRetries: STATS_MAX_RETRIES, retryOn202: true })

  if (!response || !response.ok) {
    return null
  }

  return response.json() as Promise<T>
}

interface GitHubRepo {
  name: string
  full_name: string
  description: string | null
  stargazers_count: number
  forks_count: number
  subscribers_count: number
  open_issues_count: number
  language: string | null
  topics: string[]
  license: { spdx_id: string } | null
  owner: {
    login: string
    avatar_url: string
    type: string
  }
  created_at: string
  pushed_at: string
  homepage: string | null
  archived: boolean
  fork: boolean
}

interface GitHubRelease {
  tag_name: string
  published_at: string
  prerelease: boolean
}

interface GitHubCommunityProfile {
  health_percentage: number
  files: {
    readme: unknown | null
    contributing: unknown | null
    code_of_conduct: unknown | null
    license: unknown | null
  }
}

interface GitHubCommitActivity {
  total: number
  week: number
}

async function fetchRepo(owner: string, repo: string, token?: string): Promise<RepoData> {
  const data = await apiFetch<GitHubRepo>(`/repos/${owner}/${repo}`, token)
  return {
    name: data.name,
    fullName: data.full_name,
    description: data.description ?? '',
    stars: data.stargazers_count,
    forks: data.forks_count,
    watchers: data.subscribers_count,
    openIssues: data.open_issues_count,
    openPullRequests: 0,
    language: data.language,
    topics: data.topics,
    license: data.license?.spdx_id ?? null,
    owner: {
      login: data.owner.login,
      avatarUrl: data.owner.avatar_url,
      type: data.owner.type,
    },
    createdAt: data.created_at,
    pushedAt: data.pushed_at,
    homepage: data.homepage || null,
    archived: data.archived,
    fork: data.fork,
  }
}

async function fetchLanguages(owner: string, repo: string, token?: string): Promise<LanguageBreakdown> {
  try {
    return await apiFetch<LanguageBreakdown>(`/repos/${owner}/${repo}/languages`, token)
  } catch {
    console.warn(`[warn] Could not fetch languages for ${owner}/${repo}. Language bar will be empty.`)
    return {}
  }
}

async function fetchOpenPullRequestCount(owner: string, repo: string, token?: string): Promise<number> {
  const data = await apiFetch<{ total_count: number }>(
    `/search/issues?q=repo:${owner}/${repo}+type:pr+state:open&per_page=1`,
    token,
  )
  return data.total_count
}

async function fetchCommitActivity(owner: string, repo: string, token?: string): Promise<number[]> {
  const data = await apiFetchWithRetry<GitHubCommitActivity[]>(`/repos/${owner}/${repo}/stats/commit_activity`, token)
  if (!data) {
    console.warn(
      `[warn] Could not fetch commit activity for ${owner}/${repo} (GitHub stats not ready). Sparkline will be empty.`,
    )
    return []
  }
  const allWeeks = data.map((week) => week.total)
  return allWeeks.slice(-26)
}

async function fetchLatestRelease(owner: string, repo: string, token?: string): Promise<ReleaseInfo | null> {
  const data = await apiFetchWithRetry<GitHubRelease>(`/repos/${owner}/${repo}/releases/latest`, token)
  if (!data) {
    return null
  }
  return {
    tagName: data.tag_name,
    publishedAt: data.published_at,
    prerelease: data.prerelease,
  }
}

async function fetchCommunityHealth(owner: string, repo: string, token?: string): Promise<CommunityHealth | null> {
  const data = await apiFetchWithRetry<GitHubCommunityProfile>(`/repos/${owner}/${repo}/community/profile`, token)
  if (!data) {
    return null
  }
  return {
    healthPercentage: data.health_percentage,
    hasReadme: data.files.readme != null,
    hasContributing: data.files.contributing != null,
    hasCodeOfConduct: data.files.code_of_conduct != null,
    hasLicense: data.files.license != null,
  }
}

// Unicode emoji regex: matches most common emoji (emoticons, symbols, flags, skin tones, ZWJ sequences)
const EMOJI_RE = /\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu

async function fetchReadmeStats(owner: string, repo: string, token?: string): Promise<ReadmeStats | null> {
  const data = await apiFetchWithRetry<{ content: string; encoding: string }>(`/repos/${owner}/${repo}/readme`, token)
  if (!data || data.encoding !== 'base64') {
    return null
  }

  const content = Buffer.from(data.content, 'base64').toString('utf-8')
  const emDashCount = (content.match(/\u2014/g) || []).length
  const emojiCount = (content.match(EMOJI_RE) || []).length

  return { emDashCount, emojiCount }
}

export interface FetchCardOptions {
  token?: string
  style?: CardStyle
  readmeStats?: boolean
}

export async function fetchCardData(owner: string, repo: string, opts: FetchCardOptions = {}): Promise<CardData> {
  const { token, style, readmeStats: includeReadmeStats } = opts
  const needsDetailed = style === 'detailed' || style == null

  const [repoData, languages, commitActivity, release, health, openPrCount, readmeStats] = await Promise.all([
    fetchRepo(owner, repo, token),
    fetchLanguages(owner, repo, token),
    fetchCommitActivity(owner, repo, token),
    fetchLatestRelease(owner, repo, token),
    needsDetailed ? fetchCommunityHealth(owner, repo, token) : Promise.resolve(null),
    needsDetailed ? fetchOpenPullRequestCount(owner, repo, token).catch(() => 0) : Promise.resolve(0),
    includeReadmeStats ? fetchReadmeStats(owner, repo, token) : Promise.resolve(null),
  ])

  repoData.openPullRequests = openPrCount
  repoData.openIssues = Math.max(repoData.openIssues - openPrCount, 0)

  return { repo: repoData, languages, commitActivity, release, health, readmeStats }
}

export function parseRepoInput(input: string): { owner: string; repo: string } {
  const cleaned = input
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '')

  const parts = cleaned.split('/')
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid repo format: "${input}". Use owner/repo or a GitHub URL.`)
  }

  return { owner: parts[0], repo: parts[1] }
}
