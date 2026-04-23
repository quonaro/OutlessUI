<script setup lang="ts">
import Sidebar from '~/components/Sidebar.vue'
</script>

<template>
  <div class="flex min-h-screen bg-background">
    <Sidebar />
    <div class="flex-1 flex flex-col">
      <main class="flex-1">
        <slot />
      </main>
    </div>
  </div>
</template>
