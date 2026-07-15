import { defineConfig, devices } from '@playwright/test'

const frontendUrl = process.env.E2E_FRONTEND_URL ?? 'http://127.0.0.1:4173'
const backendUrl = process.env.E2E_BACKEND_URL ?? 'http://127.0.0.1:18080'
const frontendPort = new URL(frontendUrl).port || '4173'
const backendPort = new URL(backendUrl).port || '18080'
const reuseExistingServers = process.env.E2E_REUSE_SERVERS === 'true'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['line'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL: frontendUrl,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: `../complete/gradlew -p ../complete bootRun --args='--spring.profiles.active=e2e --server.port=${backendPort}'`,
      url: `${backendUrl}/api/posts`,
      timeout: 180_000,
      reuseExistingServer: reuseExistingServers,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        E2E_ALLOWED_ORIGINS: frontendUrl,
      },
    },
    {
      command: `npm --prefix ../my-react-app run dev -- --host 127.0.0.1 --port ${frontendPort} --strictPort`,
      url: frontendUrl,
      timeout: 60_000,
      reuseExistingServer: reuseExistingServers,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        VITE_API_BASE_URL: `${backendUrl}/api`,
      },
    },
  ],
})