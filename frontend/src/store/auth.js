import { create } from 'zustand'
import { api } from '../lib/api'

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: true,

  init: async () => {
    const token = localStorage.getItem('token')
    if (!token) return set({ loading: false })
    try {
      const user = await api.me()
      set({ user, token, loading: false })
    } catch {
      localStorage.removeItem('token')
      set({ user: null, token: null, loading: false })
    }
  },

  login: async (username, password) => {
    const data = await api.login(username, password)
    localStorage.setItem('token', data.access_token)
    set({ user: data.user, token: data.access_token })
    return data
  },

  register: async (username, email, password) => {
    const data = await api.register({ username, email, password })
    localStorage.setItem('token', data.access_token)
    set({ user: data.user, token: data.access_token })
    return data
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },
}))
