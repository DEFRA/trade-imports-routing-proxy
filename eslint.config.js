import { defineConfig, globalIgnores } from 'eslint/config'
import neostandard, { resolveIgnoresFromGitignore } from 'neostandard'

export default defineConfig([
  globalIgnores(resolveIgnoresFromGitignore()),
  ...neostandard({
    env: ['node', 'vitest'],
    noJsx: true,
    noStyle: true
  })
])
