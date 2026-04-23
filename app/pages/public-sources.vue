<script setup lang="ts">
import { fetchPublicSources } from '~/utils/services/public-source'

const config = useRuntimeConfig()
const baseURL = config.public.apiBase || 'http://localhost:8080'

const { data: sources, pending: isLoading } = await useAsyncData(() => fetchPublicSources(baseURL))
</script>

<template>
  <div class="p-6">
    <PublicSourceList :sources="sources || []" :loading="isLoading" />
  </div>
</template>
