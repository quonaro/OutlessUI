<script setup lang="ts">
import UiPageLayout from '~/components/ui/page-layout/page-layout.vue'
import PublicSourceList from '~/components/ui/public-source-list/public-source-list.vue'
import { fetchPublicSources } from '~/utils/services/public-source'

const config = useRuntimeConfig()
const baseURL = config.public.apiBase || 'http://localhost:8080'

const { data: sources, pending: isLoading } = await useAsyncData(() => fetchPublicSources(baseURL))
</script>

<template>
  <UiPageLayout
    title="Public Sources"
    description="Manage public subscription sources"
  >
    <PublicSourceList :sources="sources || []" :loading="isLoading" />
  </UiPageLayout>
</template>
