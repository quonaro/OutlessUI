import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', () => {
  const authCookie = useCookie<string | null>('auth_token', {
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: 'strict',
    secure: true,
  })

  const token = computed({
    get: () => authCookie.value,
    set: (val: string | null) => { authCookie.value = val },
  })

  const isAuthenticated = computed(() => !!token.value)

  function setToken(newToken: string) {
    authCookie.value = newToken
  }

  function clearToken() {
    authCookie.value = null
  }

  return {
    token,
    isAuthenticated,
    setToken,
    clearToken,
  }
})
