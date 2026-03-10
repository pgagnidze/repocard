import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/cli.ts'],
  format: 'esm',
  target: 'node22',
  skipNodeModulesBundle: true,
  clean: true,
  outDir: 'dist',
})
