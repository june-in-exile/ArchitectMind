import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/persistence/**/*.ts',
        'src/utils/nodeId.ts',
        'src/hooks/useCanvasTabs.ts',
        'src/hooks/useWorkspacePersistence.ts',
        'src/hooks/useOnlineStatus.ts',
        'src/components/PwaUpdatePrompt.tsx',
        'src/components/Toast.tsx',
        'src/components/PersistenceNotice.tsx',
        'src/notices/selectNotice.ts',
        'src/theme/themePreference.ts',
      ],
      exclude: ['src/**/*.test.{ts,tsx}'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
})
