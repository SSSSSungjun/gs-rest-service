import http from 'k6/http'
import { check, sleep } from 'k6'

const baseUrl = __ENV.BASE_URL ?? 'http://127.0.0.1:18080'
const targetVus = Number.parseInt(__ENV.VUS ?? '50', 10)
const rampUp = __ENV.RAMP_UP ?? '20s'
const duration = __ENV.DURATION ?? '1m'
const maxP95Ms = Number.parseInt(__ENV.MAX_P95_MS ?? '1000', 10)

const jsonHeaders = { headers: { 'Content-Type': 'application/json' } }

export const options = {
  stages: [
    { duration: rampUp, target: targetVus },
    { duration, target: targetVus },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    checks: ['rate>0.99'],
    http_req_failed: ['rate<0.01'],
    http_req_duration: [`p(95)<${maxP95Ms}`],
  },
}

function postJson(path, body, operation) {
  return http.post(`${baseUrl}${path}`, JSON.stringify(body), {
    ...jsonHeaders,
    tags: { operation },
  })
}

export function setup() {
  const seedPosts = []

  for (let index = 1; index <= 12; index += 1) {
    const response = postJson('/api/posts', {
      nickname: '부하테스트',
      content: `부하테스트 시드 게시글 ${index}`,
      images: [],
      pollOptions: index === 1 ? ['찬성', '반대'] : null,
      showImagesInContent: false,
    }, 'seed_post')

    const created = check(response, {
      '시드 게시글 생성 성공': (result) => result.status === 200,
    })
    if (!created) {
      throw new Error(`시드 게시글 생성 실패: ${response.status} ${response.body}`)
    }
    seedPosts.push(response.json())
  }

  const hotspot = seedPosts[0]
  return {
    postIds: seedPosts.map((post) => post.id),
    hotspotPostId: hotspot.id,
    pollOptionIds: hotspot.pollOptions.map((option) => option.id),
  }
}

export default function (data) {
  const roll = Math.random()
  const randomPostId = data.postIds[Math.floor(Math.random() * data.postIds.length)]

  if (roll < 0.45) {
    const response = http.get(`${baseUrl}/api/posts?page=1&size=10&sort=latest`, {
      tags: { operation: 'feed' },
    })
    check(response, { '목록 조회 성공': (result) => result.status === 200 })
  } else if (roll < 0.65) {
    const detail = http.get(`${baseUrl}/api/posts/${randomPostId}`, {
      tags: { operation: 'detail' },
    })
    const view = http.post(`${baseUrl}/api/posts/${randomPostId}/views`, null, {
      tags: { operation: 'view' },
    })
    check(detail, { '상세 조회 성공': (result) => result.status === 200 })
    check(view, { '조회수 증가 성공': (result) => result.status === 204 })
  } else if (roll < 0.80) {
    const response = postJson(`/api/posts/${data.hotspotPostId}/comments`, {
      nickname: `사용자${__VU}`,
      content: `동시 댓글 ${__VU}-${__ITER}-${Date.now()}`,
      parentCommentId: null,
    }, 'comment')
    check(response, { '댓글 생성 성공': (result) => result.status === 200 })
  } else if (roll < 0.90) {
    const response = http.post(`${baseUrl}/api/posts/${data.hotspotPostId}/likes`, null, {
      tags: { operation: 'like' },
    })
    check(response, { '좋아요 토글 성공': (result) => result.status === 204 })
  } else {
    const optionId = data.pollOptionIds[__VU % data.pollOptionIds.length]
    const response = http.post(
      `${baseUrl}/api/posts/${data.hotspotPostId}/poll-options/${optionId}/votes`,
      null,
      { tags: { operation: 'vote' } },
    )
    check(response, { '투표 성공': (result) => result.status === 204 })
  }

  sleep(0.2 + Math.random() * 0.8)
}
