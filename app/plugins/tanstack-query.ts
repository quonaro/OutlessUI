import { watch } from 'vue'
import { VueQueryPlugin, QueryClient, hydrate, dehydrate } from '@tanstack/vue-query'
import { defineNuxtPlugin } from 'nuxt/app'
import {
  connectAdminRealtime,
  disconnectAdminRealtime,
  setAdminRealtimeConfig,
  setAdminRealtimeQueryClient,
} from '~/utils/admin-realtime'

export default defineNuxtPlugin((nuxtApp) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        retry: false,
      },
    },
  })

  nuxtApp.vueApp.use(VueQueryPlugin, { queryClient })

  if (import.meta.client) {
    const state = nuxtApp.payload.data.vueQueryState
    if (state) {
      hydrate(queryClient, state)
    }

    const config = useRuntimeConfig()
    const token = useCookie<string | null>('auth_token')
    setAdminRealtimeQueryClient(queryClient)
    setAdminRealtimeConfig(config.public.apiBase as string, () => token.value ?? null)
    watch(
      [() => config.public.apiBase, token],
      () => {
        if (token.value) connectAdminRealtime()
        else disconnectAdminRealtime()
      },
      { immediate: true },
    )
  }

  if (import.meta.server) {
    nuxtApp.hooks.hook('app:rendered', () => {
      nuxtApp.payload.data.vueQueryState = dehydrate(queryClient)
    })
  }

  return {
    provide: {
      queryClient,
    },
  }
})
