import { resolveApiOrigin } from './apiClient'

export function resolveImageUrl(url: string) {
  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }

  if (url.startsWith('/')) {
    return `${resolveApiOrigin()}${url}`
  }

  return url
}
