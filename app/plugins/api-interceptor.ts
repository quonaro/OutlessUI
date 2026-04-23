/// <reference types="nuxt" />
import { useAuth } from '~/composables/useAuth'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const { apiBase } = config.public

  // Override global $fetch to use base URL from runtime config
  const $api = $fetch.create({
    baseURL: apiBase,
    onRequest({ options }) {
      // Add auth token if available
      const auth = useAuth()
      if (auth.token) {
        const headers = new Headers(options.headers as HeadersInit)
        headers.set('Authorization', `Bearer ${auth.token}`)
        options.headers = headers
      }
    },
    onResponseError({ response }) {
      // Handle 401 unauthorized - clear token and redirect to login
      if (response.status === 401) {
        const auth = useAuth()
        auth.clearToken()
        navigateTo('/login')
      }
    },
  })

  // Provide $api to all components
  return {
    provide: {
      api: $api,
    },
  }
})
