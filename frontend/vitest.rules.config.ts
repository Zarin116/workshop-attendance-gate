import { defineConfig } from 'vitest/config'

// Security rules tests only. Run through `pnpm run test:rules` at the repo
// root, which starts the Firestore emulator first.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    testTimeout: 15_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
})
