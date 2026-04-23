<script setup lang="ts">
// Props for group list
interface Props {
  groups?: Array<{
    id: number
    name: string
    description?: string
  }>
}

withDefaults(defineProps<Props>(), {
  groups: () => []
})
</script>

<template>
  <div class="space-y-4">
    <div v-if="groups.length === 0" class="text-center text-muted-foreground py-8">
      No groups found
    </div>
    
    <div v-for="group in groups" :key="group.id" class="border rounded-lg p-4">
      <h3 class="font-semibold text-lg">{{ group.name }}</h3>
      <p v-if="group.description" class="text-muted-foreground text-sm mt-1">
        {{ group.description }}
      </p>
    </div>
  </div>
</template>
