<script setup lang="ts">
// Props for admin list
interface Props {
  admins?: Array<{
    id: string
    username: string
    created_at: string
  }>
}

withDefaults(defineProps<Props>(), {
  admins: () => []
})
</script>

<template>
  <div class="space-y-4">
    <div v-if="admins.length === 0" class="text-center text-muted-foreground py-8">
      No admins found
    </div>
    
    <div v-for="admin in admins" :key="admin.id" class="border rounded-lg p-4">
      <h3 class="font-semibold text-lg">{{ admin.username }}</h3>
      <p class="text-muted-foreground text-sm mt-1">
        ID: {{ admin.id }}
      </p>
      <p class="text-muted-foreground text-sm">
        Created: {{ new Date(admin.created_at).toLocaleString() }}
      </p>
    </div>
  </div>
</template>
