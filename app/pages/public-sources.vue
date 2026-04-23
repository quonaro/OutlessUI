<script setup lang="ts">
import UiPageLayout from '~/components/ui/page-layout/page-layout.vue'
import PublicSourceList from '~/components/ui/public-source-list/public-source-list.vue'

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <UiPageLayout
    title="Public Sources"
    description="Manage public subscription sources"
  >
    <PublicSourceList />
  </UiPageLayout>
</template>
