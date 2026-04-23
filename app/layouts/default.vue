<script setup lang="ts">
import Sidebar from '~/components/Sidebar.vue'
</script>

<template>
  <div class="flex min-h-screen bg-zinc-950">
    <Sidebar />
    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>
