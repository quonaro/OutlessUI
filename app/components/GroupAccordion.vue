<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { Group } from '~/utils/schemas/group'
import type { Node } from '~/utils/schemas/node'
import { deleteNode, probeNode } from '~/utils/services/node'
import { deleteUnavailableGroupNodes, updateGroup } from '~/utils/services/group'
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
const deletingNodeIDs = ref<Set<string>>(new Set())
const probingNodeIDs = ref<Set<string>>(new Set())
const cleanupGroupIDs = ref<Set<string>>(new Set())
const togglingAutoDeleteGroupIDs = ref<Set<string>>(new Set())

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

const updateGroupMutation = useMutation({
  mutationFn: ({ id, group }: { id: string, group: { name: string, source_url: string, auto_delete_unavailable: boolean } }) =>
    updateGroup(id, group, baseURL),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['groups'] })
  },
})

const deleteUnavailableMutation = useMutation({
  mutationFn: (groupID: string) => deleteUnavailableGroupNodes(groupID, baseURL),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['nodes'] })
    queryClient.invalidateQueries({ queryKey: ['groups'] })
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
  }).sort((a, b) => statusSortRank(a.status) - statusSortRank(b.status))
}

function startSync(group: Group) {
  const sync = stateForGroup(group.id)
  sync.startSync()
}

function cancelSync(group: Group) {
  stateForGroup(group.id).cancelSync()
}

function removeNode(node: Node) {
  if (!confirm(`Delete node ${node.id}?`)) return
  const next = new Set(deletingNodeIDs.value)
  next.add(node.id)
  deletingNodeIDs.value = next
  deleteMutation.mutate(node.id, {
    onSettled: () => {
      const current = new Set(deletingNodeIDs.value)
      current.delete(node.id)
      deletingNodeIDs.value = current
    },
  })
}

function retryNode(node: Node) {
  const next = new Set(probingNodeIDs.value)
  next.add(node.id)
  probingNodeIDs.value = next
  probeMutation.mutate(node.id, {
    onSettled: () => {
      const current = new Set(probingNodeIDs.value)
      current.delete(node.id)
      probingNodeIDs.value = current
    },
  })
}

function deleteUnavailable(group: Group) {
  if (!confirm(`Delete all unavailable nodes in ${group.name}?`)) return
  const next = new Set(cleanupGroupIDs.value)
  next.add(group.id)
  cleanupGroupIDs.value = next
  deleteUnavailableMutation.mutate(group.id, {
    onSettled: () => {
      const current = new Set(cleanupGroupIDs.value)
      current.delete(group.id)
      cleanupGroupIDs.value = current
    },
  })
}

function toggleAutoDelete(group: Group, checked: boolean) {
  const next = new Set(togglingAutoDeleteGroupIDs.value)
  next.add(group.id)
  togglingAutoDeleteGroupIDs.value = next
  updateGroupMutation.mutate({
    id: group.id,
    group: {
      name: group.name,
      source_url: group.source_url ?? '',
      auto_delete_unavailable: checked,
    },
  }, {
    onSettled: () => {
      const current = new Set(togglingAutoDeleteGroupIDs.value)
      current.delete(group.id)
      togglingAutoDeleteGroupIDs.value = current
    },
  })
}

function statusSortRank(status: Node['status']): number {
  if (status === 'healthy') return 0
  if (status === 'unknown') return 1
  return 2
}

function isUnavailable(status: Node['status']): boolean {
  return status === 'unknown' || status === 'unhealthy'
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
          <p class="truncate font-medium">
            {{ group.name }} <span class="text-muted-foreground">({{ group.total_nodes }})</span>
          </p>
          <p class="truncate text-xs text-muted-foreground">
            {{ group.source_url || 'Manual group' }}
            <span v-if="group.last_synced_at"> · Last sync: {{ new Date(group.last_synced_at).toLocaleString() }}</span>
          </p>
        </div>
        <div class="flex items-center gap-2">
          <label class="flex items-center gap-1 text-xs text-muted-foreground" @click.stop>
            <input
              type="checkbox"
              :checked="group.auto_delete_unavailable"
              :disabled="togglingAutoDeleteGroupIDs.has(group.id)"
              @change="toggleAutoDelete(group, ($event.target as HTMLInputElement).checked)"
            >
            Auto-delete unavailable
          </label>
          <UiButton
            size="sm"
            variant="outline"
            :disabled="!group.source_url || stateForGroup(group.id).isSyncing"
            @click.prevent="startSync(group)"
          >
            {{ stateForGroup(group.id).isSyncing ? 'Syncing...' : 'Sync' }}
          </UiButton>
          <UiButton
            v-if="stateForGroup(group.id).isSyncing"
            size="sm"
            variant="outline"
            @click.prevent="cancelSync(group)"
          >
            Cancel sync
          </UiButton>
        </div>
      </summary>

      <CardContent class="space-y-2 border-t px-4 py-3">
        <div class="flex items-center justify-between gap-2">
          <p
            v-if="stateForGroup(group.id).isCancelled"
            class="text-xs text-amber-600"
          >
            Sync cancelled
          </p>
          <p
            v-else-if="stateForGroup(group.id).deletedUnavailableCount > 0"
            class="text-xs text-muted-foreground"
          >
            Auto-deleted: {{ stateForGroup(group.id).deletedUnavailableCount }}
          </p>
          <UiButton
            variant="destructive"
            size="sm"
            :disabled="cleanupGroupIDs.has(group.id)"
            @click="deleteUnavailable(group)"
          >
            {{ cleanupGroupIDs.has(group.id) ? 'Deleting...' : 'DELETE UNAVAILABLE' }}
          </UiButton>
        </div>

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
          :class="isUnavailable(node.status) ? 'border-red-400/60 bg-red-500/5' : ''"
        >
          <CardContent class="p-0">
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ node.url }}</p>
                <p class="text-xs text-muted-foreground">
                  {{ node.id }} · {{ node.latency_ms }} ms
                </p>
                <p class="mt-1 text-xs">
                  <span
                    class="rounded px-1.5 py-0.5"
                    :class="node.status === 'healthy'
                      ? 'bg-emerald-500/15 text-emerald-700'
                      : node.status === 'unhealthy'
                        ? 'bg-red-500/15 text-red-700'
                        : 'bg-amber-500/15 text-amber-700'"
                  >
                    {{ node.status }}
                  </span>
                  <span v-if="stateForGroup(group.id).syncingNodes.get(node.id)?.error" class="ml-2 text-red-600">
                    {{ stateForGroup(group.id).syncingNodes.get(node.id)?.error }}
                  </span>
                </p>
              </div>
              <div class="flex gap-1">
                <UiButton
                  v-if="isUnavailable(node.status)"
                  variant="outline"
                  size="sm"
                  :disabled="probingNodeIDs.has(node.id)"
                  @click="retryNode(node)"
                >
                  {{ probingNodeIDs.has(node.id) ? 'Retrying...' : 'Retry' }}
                </UiButton>
                <UiButton
                  variant="destructive"
                  size="sm"
                  :disabled="deletingNodeIDs.has(node.id)"
                  @click="removeNode(node)"
                >
                  {{ deletingNodeIDs.has(node.id) ? 'Deleting...' : 'Delete' }}
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
