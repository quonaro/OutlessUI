export default defineNuxtPlugin(() => {
  if (!import.meta.dev) {
    return
  }

  const router = useRouter()
  const originalPush = router.push.bind(router)
  const originalReplace = router.replace.bind(router)

  router.push = ((to) => {
    const path = typeof to === 'string' ? to : to.path
    if (path?.startsWith('/api')) {
      console.debug('[trace][router] push to API path', to)
      console.trace('[trace][router] push stack')
    }
    return originalPush(to as any)
  }) as typeof router.push

  router.replace = ((to) => {
    const path = typeof to === 'string' ? to : to.path
    if (path?.startsWith('/api')) {
      console.debug('[trace][router] replace to API path', to)
      console.trace('[trace][router] replace stack')
    }
    return originalReplace(to as any)
  }) as typeof router.replace
})
