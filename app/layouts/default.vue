<script setup lang="ts">
const token = useCookie('auth_token')
const isAuthenticated = computed(() => !!token.value)

onMounted(() => {
  if (!isAuthenticated.value) {
    navigateTo('/login')
  }
})
</script>

<template>
  <div class="min-h-screen bg-zinc-950">
    <slot />
  </div>
</template>
