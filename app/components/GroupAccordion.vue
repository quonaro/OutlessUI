<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { Group } from '~/utils/schemas/group'
import type { Node } from '~/utils/schemas/node'
import { deleteNode, probeNode } from '~/utils/services/node'
import UiButton from '~/components/ui/button/button.vue'
import UiCard from '~/components/ui/card/card.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import { useGroupSync } from '~/composables/groups/useGroupSync'

const props = defineProps<{
  groups: Group[]
  nodes: Node[]
  search: string
  statusFilter: 'all' | 'healthy' | 'unhealthy' | 'unknown'
}>()

const queryClient = useQueryClient()
const config = useRuntimeConfig()
const baseURL = config.public.apiBase as string
const syncStates = reactive<Record<string, ReturnType<typeof useGroupSync>>>({})

const deleteMutation = useMutation({
  mutationFn: (id: string) => deleteNode(id, baseURL),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['nodes'] })
  },
})

const probeMutation = useMutation({
  mutationFn: (id: string) => probeNode(id, baseURL),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['nodes'] })
  },
})

function stateForGroup(groupID: string) {
  if (!syncStates[groupID]) {
    syncStates[groupID] = useGroupSync(groupID)
  }
  return syncStates[groupID]
}

function matchesStatus(node: Node): boolean {
  return props.statusFilter === 'all' ? true : node.status === props.statusFilter
}

const normalizedSearch = computed(() => props.search.trim().toLowerCase())

const nodesByGroup = computed(() => {
  const map: Record<string, Node[]> = {}
  for (const node of props.nodes) {
    const key = node.group_id || '__ungrouped__'
    if (!map[key]) {
      map[key] = []
    }
    map[key].push(node)
  }
  return map
})

const visibleGroups = computed(() => {
  const search = normalizedSearch.value
  return props.groups.filter((group) => {
    const groupNodes = nodesByGroup.value[group.id] ?? []
    const filteredNodes = groupNodes.filter((node) => {
      if (!matchesStatus(node)) return false
      if (!search) return true
      const hay = `${node.url} ${node.id} ${node.country}`.toLowerCase()
      return hay.includes(search)
    })

    if (!search) return true
    if (group.name.toLowerCase().includes(search)) return true
    if ((group.source_url ?? '').toLowerCase().includes(search)) return true
    return filteredNodes.length > 0
  })
})

function visibleNodesForGroup(group: Group): Node[] {
  const search = normalizedSearch.value
  const source = nodesByGroup.value[group.id] ?? []
  return source.filter((node) => {
    if (!matchesStatus(node)) return false
    if (!search) return true
    const hay = `${node.url} ${node.id} ${node.country}`.toLowerCase()
    return hay.includes(search)
  })
}

function startSync(group: Group) {
  const sync = stateForGroup(group.id)
  sync.startSync()
}

function removeNode(node: Node) {
  if (!confirm(`Delete node ${node.id}?`)) return
  deleteMutation.mutate(node.id)
}

function retryNode(node: Node) {
  probeMutation.mutate(node.id)
}
</script>

<template>
  <div class="space-y-3">
    <details
      v-for="group in visibleGroups"
      :key="group.id"
      class="rounded-md border bg-card"
      open
    >
      <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <div class="min-w-0">
          <p class="truncate font-medium">{{ group.name }}</p>
          <p class="truncate text-xs text-muted-foreground">
            {{ group.source_url || 'Manual group' }}
            <span v-if="group.last_synced_at"> · Last sync: {{ new Date(group.last_synced_at).toLocaleString() }}</span>
          </p>
        </div>
        <div class="flex items-center gap-2">
          <UiButton
            size="sm"
            variant="outline"
            :disabled="!group.source_url || stateForGroup(group.id).isSyncing"
            @click.prevent="startSync(group)"
          >
            {{ stateForGroup(group.id).isSyncing ? 'Syncing...' : 'Sync' }}
          </UiButton>
        </div>
      </summary>

      <CardContent class="space-y-2 border-t px-4 py-3">
        <p
          v-if="stateForGroup(group.id).error"
          class="text-xs text-red-500"
        >
          {{ stateForGroup(group.id).error }}
        </p>

        <UiCard
          v-for="node in visibleNodesForGroup(group)"
          :key="node.id"
          class="px-3 py-2"
        >
          <CardContent class="p-0">
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ node.url }}</p>
                <p class="text-xs text-muted-foreground">
                  {{ node.id }} · {{ node.status }} · {{ node.latency_ms }} ms
                </p>
              </div>
              <div class="flex gap-1">
                <UiButton
                  v-if="node.status === 'unhealthy'"
                  variant="outline"
                  size="sm"
                  :disabled="probeMutation.isPending"
                  @click="retryNode(node)"
                >
                  Retry
                </UiButton>
                <UiButton
                  variant="destructive"
                  size="sm"
                  :disabled="deleteMutation.isPending"
                  @click="removeNode(node)"
                >
                  Delete
                </UiButton>
              </div>
            </div>
          </CardContent>
        </UiCard>

        <p
          v-if="visibleNodesForGroup(group).length === 0"
          class="py-4 text-center text-sm text-muted-foreground"
        >
          No nodes in this group
        </p>
      </CardContent>
    </details>
  </div>
</template>
