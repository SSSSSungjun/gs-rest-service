import axios from 'axios'

export function resolveApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }

  return '/api'
}

export function resolveApiOrigin() {
  const baseUrl = resolveApiBaseUrl()
  if (baseUrl.startsWith('/')) {
    return ''
  }
  return baseUrl.replace(/\/api\/?$/, '')
}

export function isApiErrorStatus(error: unknown, status: number) {
  return axios.isAxiosError(error) && error.response?.status === status
}

const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
})

export default apiClient