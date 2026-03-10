import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/cli.ts'],
  format: 'esm',
  target: 'node22',
  clean: true,
  outDir: 'dist',
  deps: {
    skipNodeModulesBundle: true,
  },
  env: {
    GITHUB_SHA: process.env.GITHUB_SHA || '',
    BUILD_DATE: process.env.BUILD_DATE || '',
  },
})
