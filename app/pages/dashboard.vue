<script setup lang="ts">
import UiPageLayout from '~/components/ui/page-layout/page-layout.vue'

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <UiPageLayout
    title="Dashboard"
    description="Welcome to the dashboard"
  >
    <div class="text-muted-foreground">
      <!-- Dashboard content will be here -->
    </div>
  </UiPageLayout>
</template>
