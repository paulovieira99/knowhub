const BASE = '/api'

function getToken() {
  return localStorage.getItem('token')
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (options.body instanceof FormData) delete headers['Content-Type']

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
    return
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err.detail || 'Request failed')
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  // Auth
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (username, password) => {
    const form = new URLSearchParams({ username, password })
    return fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    }).then(async (res) => {
      if (!res.ok) throw new Error((await res.json()).detail || 'Login failed')
      return res.json()
    })
  },
  me: () => request('/auth/me'),

  // Entries
  listEntries: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString()
    return request(`/entries${qs ? '?' + qs : ''}`)
  },
  getEntry: (id) => request(`/entries/${id}`),
  createEntry: (data) => request('/entries', { method: 'POST', body: JSON.stringify(data) }),
  updateEntry: (id, data) => request(`/entries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEntry: (id) => request(`/entries/${id}`, { method: 'DELETE' }),
  listTags: () => request('/entries/tags/all'),

  // Attachments
  uploadFile: (entryId, file) => {
    const form = new FormData()
    form.append('file', file)
    return request(`/attachments/${entryId}`, { method: 'POST', body: form })
  },
  deleteAttachment: (id) => request(`/attachments/${id}`, { method: 'DELETE' }),
  fileUrl: (storedName) => `${BASE}/attachments/file/${storedName}?token=${getToken()}`,
}
