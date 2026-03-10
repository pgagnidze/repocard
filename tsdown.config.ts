import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/cli.ts'],
  format: 'esm',
  target: 'node22',
  skipNodeModulesBundle: true,
  clean: true,
  outDir: 'dist',
  env: {
    GITHUB_SHA: process.env.GITHUB_SHA || '',
    BUILD_DATE: process.env.BUILD_DATE || '',
  },
})
