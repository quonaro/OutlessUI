<script setup lang="ts">
import type { PublicSource } from '~/utils/schemas/public-source'

interface Props {
  sources: PublicSource[]
  loading?: boolean
}

defineProps<Props>()
</script>

<template>
  <div class="space-y-4">
    <div v-if="loading" class="text-sm text-muted-foreground">
      Loading...
    </div>
    <div v-else-if="sources.length === 0" class="text-sm text-muted-foreground">
      No public sources found
    </div>
    <div v-else class="space-y-2">
      <div
        v-for="source in sources"
        :key="source.id"
        class="rounded-lg border bg-card p-4"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">{{ source.url }}</p>
            <p class="text-sm text-muted-foreground">
              Group: {{ source.group_id }}
            </p>
          </div>
          <div class="text-xs text-muted-foreground">
            {{ source.last_fetched_at ? `Fetched: ${new Date(source.last_fetched_at).toLocaleString()}` : 'Never fetched' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
