import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

api.interceptors.response.use(
  res => {
    const contentType = res.headers?.['content-type'] || ''
    if (typeof res.data === 'string' && contentType.includes('text/html')) {
      return Promise.reject(new Error('API is misconfigured: frontend received HTML instead of JSON. Check VITE_API_BASE_URL or Vercel rewrites.'))
    }
    return res.data
  },
  err => {
    const msg = err.response?.data?.error || err.message || 'Request failed'
    return Promise.reject(new Error(msg))
  }
)

// --- Problems ---
export const getProblems = (filters = {}) =>
  api.get('/problems', { params: filters })

export const getProblem = (slug) =>
  api.get(`/problems/${slug}`)

export const getCategories = () =>
  api.get('/problems/meta/categories')

// --- Sessions ---
export const createSession = (problem_id, user_fingerprint) =>
  api.post('/sessions', { problem_id, user_fingerprint })

export const updateSession = (session_id, data) =>
  api.patch(`/sessions/${session_id}`, data)

export const getSession = (session_id) =>
  api.get(`/sessions/${session_id}`)

export const getUserSessions = (fingerprint) =>
  api.get(`/sessions/user/${fingerprint}`)

// --- Hints (SSE streaming) ---
export function streamHint({ session_id, hint_level, user_code, onDelta, onDone, onError }) {
  return fetch(`${API_BASE_URL}/hints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, hint_level, user_code }),
  }).then(async (response) => {
    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to get hint')
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'delta') onDelta(data.text)
          else if (data.type === 'done') onDone(data)
          else if (data.type === 'error') onError(new Error(data.error))
        } catch {}
      }
    }
  }).catch(onError)
}

// --- Execute ---
export const executeCode = (session_id, code, run_tests = false) =>
  api.post('/execute', { session_id, code, run_tests })

// --- Analytics ---
export const getDashboard = () =>
  api.get('/analytics/dashboard')

// --- Fingerprint (pseudo-anonymous user ID) ---
export function getFingerprint() {
  const key = 'codebuddy_fp'
  let fp = localStorage.getItem(key)
  if (!fp) {
    fp = 'fp_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem(key, fp)
  }
  return fp
}
