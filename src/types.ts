export interface RepoOwner {
  login: string
  avatarUrl: string
  type: string
}

export interface RepoData {
  name: string
  fullName: string
  description: string
  stars: number
  forks: number
  watchers: number
  openIssues: number
  openPullRequests: number
  language: string | null
  topics: string[]
  license: string | null
  owner: RepoOwner
  createdAt: string
  pushedAt: string
  homepage: string | null
  archived: boolean
  fork: boolean
}

export interface LanguageBreakdown {
  [language: string]: number
}

export interface ReleaseInfo {
  tagName: string
  publishedAt: string
  prerelease: boolean
}

export interface CommunityHealth {
  healthPercentage: number
  hasReadme: boolean
  hasContributing: boolean
  hasCodeOfConduct: boolean
  hasLicense: boolean
}

export interface CardData {
  repo: RepoData
  languages: LanguageBreakdown
  commitActivity: number[]
  release: ReleaseInfo | null
  health: CommunityHealth | null
}

export type CardStyle = 'minimal' | 'detailed'
export type CardSize = 'landscape' | 'square' | 'banner'

export const CARD_DIMENSIONS = {
  landscape: { width: 800, height: 418 },
  square: { width: 800, height: 800 },
  banner: { width: 1500, height: 500 },
} as const

export const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Lua: '#000080',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Scala: '#c22d40',
  Elixir: '#6e4a7e',
  Haskell: '#5e5086',
  Clojure: '#db5855',
  Zig: '#ec915c',
  Vim: '#199f4b',
  Nix: '#7e7eff',
  OCaml: '#3be133',
  Erlang: '#B83998',
  R: '#198CE7',
  Julia: '#a270ba',
  Vue: '#41b883',
  Svelte: '#ff3e00',
}
