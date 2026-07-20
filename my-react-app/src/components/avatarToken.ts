const AVATAR_TOKENS = ['🌱', '🍀', '🌿', '🍃', '🌼', '🎋']
const ANONYMOUS_AVATAR_TOKEN_KEY = 'bamboo-anonymous-avatar-token-v1'

let memoryAvatarToken = ''

function createAnonymousAvatarToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getAnonymousAvatarToken() {
  if (typeof window === 'undefined') return 'anonymous-session'

  try {
    const storedToken = window.localStorage.getItem(ANONYMOUS_AVATAR_TOKEN_KEY)
    if (storedToken) return storedToken

    const nextToken = createAnonymousAvatarToken()
    window.localStorage.setItem(ANONYMOUS_AVATAR_TOKEN_KEY, nextToken)
    return nextToken
  } catch {
    if (!memoryAvatarToken) memoryAvatarToken = createAnonymousAvatarToken()
    return memoryAvatarToken
  }
}

export function getAvatarToken(seed: number, nickname: string) {
  const nicknameHash = Array.from(nickname || '익명').reduce(
    (hash, character) => ((hash * 31) + (character.codePointAt(0) ?? 0)) | 0,
    0,
  )
  const tokenIndex = Math.abs(nicknameHash + (seed * 17)) % AVATAR_TOKENS.length

  return {
    symbol: AVATAR_TOKENS[tokenIndex],
    tone: tokenIndex + 1,
  }
}

export function getComposerAvatarToken() {
  return getAvatarToken(0, getAnonymousAvatarToken())
}
