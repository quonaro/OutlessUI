<script setup lang="ts">
import Sidebar from '~/components/Sidebar.vue'
import { Toaster } from 'vue-sonner'

const colorMode = useColorMode()
</script>

<template>
  <div class="flex min-h-screen bg-background">
    <div class="sticky top-0 h-screen">
      <Sidebar />
    </div>
    <div class="flex-1 flex flex-col overflow-hidden">
      <main class="flex-1 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
  <Toaster
    richColors
    position="top-right"
    :theme="colorMode.value as 'light' | 'dark' | undefined"
  />
</template>
