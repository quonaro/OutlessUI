export function useAuth() {
  const token = useCookie<string | null>('auth_token', {
    default: () => null,
  })

  const user = useState<{ id: number; email: string } | null>('auth_user', () => null)

  const isAuthenticated = computed(() => !!token.value)

  const setToken = (newToken: string) => {
    token.value = newToken
  }

  const clearToken = () => {
    token.value = null
    user.value = null
  }

  const setUser = (newUser: { id: number; email: string }) => {
    user.value = newUser
  }

  return {
    token: readonly(token),
    user: readonly(user),
    isAuthenticated,
    setToken,
    clearToken,
    setUser,
  }
}
