import { defineConfig, devices } from '@playwright/test'

const frontendUrl = process.env.E2E_FRONTEND_URL ?? 'http://127.0.0.1:5173'
const backendUrl = process.env.E2E_BACKEND_URL ?? 'http://127.0.0.1:8080'

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
      command: "../complete/gradlew -p ../complete bootRun --args='--spring.profiles.active=e2e'",
      url: `${backendUrl}/api/posts`,
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm --prefix ../my-react-app run dev -- --host 127.0.0.1 --port 5173',
      url: frontendUrl,
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_API_BASE_URL: `${backendUrl}/api`,
      },
    },
  ],
})
