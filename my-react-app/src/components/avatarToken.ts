const AVATAR_TOKENS = ['🌱', '🍀', '🌿', '🍃', '🌼', '🎋']

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
