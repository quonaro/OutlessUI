export default defineNuxtRouteMiddleware((to) => {
  const token = useCookie<string | null>('auth_token')

  // Skip auth check for login page
  if (to.path === '/login') {
    return
  }

  if (!token.value) {
    return navigateTo('/login')
  }
})
