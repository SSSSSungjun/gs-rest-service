import axios from 'axios'

export function resolveApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }

  const { protocol, hostname } = window.location
  return `${protocol}//${hostname}:8081/api`
}

export function resolveApiOrigin() {
  return resolveApiBaseUrl().replace(/\/api\/?$/, '')
}

const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
})

export default apiClient
