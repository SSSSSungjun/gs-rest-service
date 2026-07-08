function resolveUploadBaseUrl() {
  const baseUrl = import.meta.env.VITE_UPLOAD_BASE_URL ?? ''
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}

export function resolveImageUrl(url: string) {
  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }

  if (url.startsWith('/')) {
    return `${resolveUploadBaseUrl()}${url}`
  }

  return url
}
