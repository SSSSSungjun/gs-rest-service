import { expect, test, type Page } from '@playwright/test'

const frontendUrl = process.env.E2E_FRONTEND_URL ?? 'http://127.0.0.1:4173'
const backendUrl = process.env.E2E_BACKEND_URL ?? 'http://127.0.0.1:18080'

function uniqueValue(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function openBoard(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '대나무숲' })).toBeVisible()
  await expect(page.getByText('게시글을 불러오는 중입니다.')).toBeHidden()
}

async function createPost(page: Page, nickname: string, content: string) {
  await page.getByRole('button', { name: '무슨 일이 있었나요?' }).click()
  await page.getByLabel('게시글 닉네임').fill(nickname)
  await page.getByLabel('게시글 내용').fill(content)
  await page.getByRole('button', { name: '게시', exact: true }).click()

  await expect(page.locator('section.composer-screen')).toBeHidden()
  const post = page.locator('article.post-card').filter({ hasText: content }).first()
  await expect(post).toBeVisible()
  return post
}

test('서로 다른 익명 사용자의 소유권과 댓글 왕복을 검증한다', async ({ browser, page }) => {
  const postContent = uniqueValue('가상사용자-게시글')
  const commentContent = uniqueValue('가상사용자-댓글')

  await openBoard(page)
  const writerPost = await createPost(page, '작성자', postContent)
  await expect(writerPost.getByLabel('게시글 메뉴')).toBeVisible()

  const readerContext = await browser.newContext({
    baseURL: frontendUrl,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  })
  const readerPage = await readerContext.newPage()

  try {
    await openBoard(readerPage)
    const readerPost = readerPage.locator('article.post-card').filter({ hasText: postContent }).first()
    await expect(readerPost).toBeVisible()
    await expect(readerPost.getByLabel('게시글 메뉴')).toHaveCount(0)
    await readerPost.getByLabel('게시글 상세 보기').click()

    await readerPage.getByLabel('댓글 닉네임').fill('댓글작성자')
    await readerPage.getByLabel('댓글 내용').fill(commentContent)
    await readerPage.getByLabel('댓글 내용').locator('..').getByRole('button', { name: '등록' }).click()
    await expect(readerPage.getByText(commentContent)).toBeVisible()
    await expect(readerPage.getByLabel('댓글 메뉴')).toBeVisible()

    const writerSession = (await page.context().cookies()).find(
      (cookie) => cookie.name === 'anonymous_session_id',
    )
    const readerSession = (await readerContext.cookies()).find(
      (cookie) => cookie.name === 'anonymous_session_id',
    )
    expect(writerSession?.value).toBeTruthy()
    expect(readerSession?.value).toBeTruthy()
    expect(readerSession?.value).not.toBe(writerSession?.value)

    await page.reload()
    const refreshedPost = page.locator('article.post-card').filter({ hasText: postContent }).first()
    await expect(refreshedPost).toBeVisible()
    await refreshedPost.getByLabel('게시글 상세 보기').click()
    await expect(page.getByText(commentContent)).toBeVisible()
    await expect(page.getByLabel('댓글 메뉴')).toHaveCount(0)
  } finally {
    await readerContext.close()
  }
})

test('검색은 제출 시 적용되고 일치 키워드를 강조한다', async ({ page }) => {
  const keyword = uniqueValue('강조검색어')
  const postContent = `검색 제출 동작을 확인하는 글 ${keyword}`

  await openBoard(page)
  await createPost(page, '검색작성자', postContent)

  await page.getByLabel('게시글 검색어').fill(keyword)
  await expect(page.locator('mark.search-highlight')).toHaveCount(0)
  await page.getByRole('button', { name: '게시글 검색 실행' }).click()

  const result = page.locator('article.post-card').filter({ hasText: postContent }).first()
  await expect(result).toBeVisible()
  await expect(result.locator('mark.search-highlight')).toHaveText(keyword)
})


test('검색 결과를 서버 설정 크기로 나눠 조회한다', async ({ page }) => {
  const keyword = uniqueValue('서버페이지')

  await openBoard(page)
  for (let index = 1; index <= 9; index += 1) {
    const response = await page.context().request.post(`${backendUrl}/api/posts`, {
      data: {
        nickname: '페이지작성자',
        content: `${keyword} 게시글 ${index}`,
        showImagesInContent: true,
      },
    })
    expect(response.ok()).toBeTruthy()
  }

  await page.reload()
  await page.getByLabel('게시글 검색어').fill(keyword)
  await page.getByRole('button', { name: '게시글 검색 실행' }).click()
  await expect(page.locator('article.post-card')).toHaveCount(8)
  await expect(page.locator('.pagination-total')).toHaveText('/ 2')

  await page.getByRole('button', { name: '2', exact: true }).click()
  await expect(page.locator('article.post-card')).toHaveCount(1)
  await expect(page.locator('[aria-current="page"]')).toHaveText('2')
})

for (const viewport of [
  { label: '소형 모바일', width: 320, height: 740 },
  { label: '태블릿', width: 768, height: 1024 },
]) {
  test(`${viewport.label}에서 가로 넘침 없이 작성 화면을 연다`, async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: frontendUrl,
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.width < 600,
      hasTouch: viewport.width < 600,
      locale: 'ko-KR',
    })
    const page = await context.newPage()

    try {
      await openBoard(page)
      const initialWidth = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }))
      expect(initialWidth.scroll).toBeLessThanOrEqual(initialWidth.client + 1)

      await page.getByRole('button', { name: '무슨 일이 있었나요?' }).click()
      await expect(page.getByLabel('게시글 작성', { exact: true })).toBeVisible()

      const composerWidth = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }))
      expect(composerWidth.scroll).toBeLessThanOrEqual(composerWidth.client + 1)
    } finally {
      await context.close()
    }
  })
}