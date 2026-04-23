import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null as string | null,
    user: null as { id: number; email: string } | null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
  },

  actions: {
    setToken(token: string) {
      this.token = token
    },

    clearToken() {
      this.token = null
      this.user = null
    },

    setUser(user: { id: number; email: string }) {
      this.user = user
    },
  },
})
