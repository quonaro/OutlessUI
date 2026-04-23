<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: [
    () => navigateTo('/settings', { redirectCode: 301 }),
  ],
})
</script>

<template>
  <div />
</template>
