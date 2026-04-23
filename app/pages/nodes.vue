<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import UiPageLayout from '~/components/ui/page-layout/page-layout.vue'
import UiButton from '~/components/ui/button/button.vue'
import UiInput from '~/components/ui/input/input.vue'
import UiCard from '~/components/ui/card/card.vue'
import CardHeader from '~/components/ui/card/CardHeader.vue'
import CardTitle from '~/components/ui/card/CardTitle.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import CardFooter from '~/components/ui/card/CardFooter.vue'
import GroupAccordion from '~/components/GroupAccordion.vue'
import { useInfiniteNodes } from '~/composables/nodes/useInfiniteNodes'
import { useGroups } from '~/composables/groups/useGroups'
import type { Node } from '~/utils/schemas/node'
import { createNode, deleteNode, probeNode } from '~/utils/services/node'
import { createGroup } from '~/utils/services/group'

definePageMeta({ layout: 'default' })

type ViewMode = 'grouped' | 'flat'
type StatusFilter = 'all' | 'healthy' | 'unhealthy' | 'unknown'

const queryClient = useQueryClient()
const config = useRuntimeConfig()
const baseURL = config.public.apiBase as string
const {
  data: nodePages,
  isLoading: nodesLoading,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useInfiniteNodes()
const { data: groups, isLoading: groupsLoading } = useGroups()
const loadMoreAnchor = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const allNodes = computed<Node[]>(() =>
  nodePages.value?.pages.flatMap((page) => page.nodes) ?? []
)


const viewMode = ref<ViewMode>('grouped')
const search = ref('')
const statusFilter = ref<StatusFilter>('all')

const showCreateGroupDialog = ref(false)
const showCreateNodeDialog = ref(false)
const groupNameInput = ref('')
const groupSourceURLInput = ref('')
const nodeURLInput = ref('')
const nodeGroupIDInput = ref('')
const isCreateGroupSubmitting = ref(false)
const isCreateNodeSubmitting = ref(false)
const deletingNodeIDs = ref<Set<string>>(new Set())
const probingNodeIDs = ref<Set<string>>(new Set())

const createGroupMutation = useMutation({
  mutationFn: (payload: { name: string; source_url: string }) => createGroup(payload, baseURL),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['groups'] })
    showCreateGroupDialog.value = false
    groupNameInput.value = ''
    groupSourceURLInput.value = ''
  },
})

const createNodeMutation = useMutation({
  mutationFn: (payload: { url: string; group_id: string }) => createNode(payload, baseURL),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['nodes'] })
    showCreateNodeDialog.value = false
    nodeURLInput.value = ''
    nodeGroupIDInput.value = ''
  },
})

const deleteNodeMutation = useMutation({
  mutationFn: (id: string) => deleteNode(id, baseURL),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nodes'] }),
})

const probeNodeMutation = useMutation({
  mutationFn: (id: string) => probeNode(id, baseURL),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nodes'] }),
})

const groupNameByID = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const group of groups.value ?? []) {
    map[group.id] = group.name
  }
  return map
})

const filteredFlatNodes = computed<Node[]>(() => {
  const list = allNodes.value
  const searchValue = search.value.trim().toLowerCase()
  return list.filter((node) => {
    if (statusFilter.value !== 'all' && node.status !== statusFilter.value) {
      return false
    }
    if (!searchValue) return true
    const groupName = groupNameByID.value[node.group_id] ?? ''
    const haystack = `${node.url} ${node.id} ${node.country} ${groupName}`.toLowerCase()
    return haystack.includes(searchValue)
  })
})

function submitCreateGroup() {
  const name = groupNameInput.value.trim()
  const sourceURL = groupSourceURLInput.value.trim()
  if (!name || isCreateGroupSubmitting.value) return
  isCreateGroupSubmitting.value = true
  createGroupMutation.mutate(
    { name, source_url: sourceURL },
    { onSettled: () => { isCreateGroupSubmitting.value = false } },
  )
}

function submitCreateNode() {
  const url = nodeURLInput.value.trim()
  if (!url || isCreateNodeSubmitting.value) return
  isCreateNodeSubmitting.value = true
  createNodeMutation.mutate(
    { url, group_id: nodeGroupIDInput.value },
    { onSettled: () => { isCreateNodeSubmitting.value = false } },
  )
}

function removeNode(node: Node) {
  if (!confirm(`Delete node ${node.id}?`)) return
  const next = new Set(deletingNodeIDs.value)
  next.add(node.id)
  deletingNodeIDs.value = next
  deleteNodeMutation.mutate(node.id, {
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
  probeNodeMutation.mutate(node.id, {
    onSettled: () => {
      const current = new Set(probingNodeIDs.value)
      current.delete(node.id)
      probingNodeIDs.value = current
    },
  })
}

function isUnavailable(status: Node['status']): boolean {
  return status === 'unknown' || status === 'unhealthy'
}

function maybeLoadMore() {
  if (hasNextPage.value && !isFetchingNextPage.value) {
    fetchNextPage()
  }
}

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    const hit = entries.some((entry) => entry.isIntersecting)
    if (hit) {
      maybeLoadMore()
    }
  }, { rootMargin: '250px 0px 250px 0px' })

  if (loadMoreAnchor.value) {
    observer.observe(loadMoreAnchor.value)
  }
})

onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
})
</script>

<template>
  <UiPageLayout title="Nodes" description="Manage your proxy nodes">
    <ClientOnly>
      <template #fallback>
        <div class="py-8 text-center text-muted-foreground">Loading nodes...</div>
      </template>

      <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <UiButton variant="outline" @click="viewMode = 'grouped'">Grouped</UiButton>
            <UiButton variant="outline" @click="viewMode = 'flat'">Flat</UiButton>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <UiButton @click="showCreateGroupDialog = true">Create Group</UiButton>
            <UiButton @click="showCreateNodeDialog = true">Create Node</UiButton>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UiInput v-model="search" placeholder="Search by URL, ID, country, group..." class="max-w-md" />
          <select v-model="statusFilter" class="rounded-md border bg-background px-3 py-2 text-sm">
            <option value="all">All statuses</option>
            <option value="healthy">Healthy</option>
            <option value="unhealthy">Unhealthy</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>

        <div v-if="nodesLoading || groupsLoading" class="py-8 text-center text-muted-foreground">
          Loading data...
        </div>

        <GroupAccordion
          v-else-if="viewMode === 'grouped'"
          :groups="groups ?? []"
          :nodes="allNodes"
          :search="search"
          :status-filter="statusFilter"
        />

        <div v-else class="space-y-2">
          <UiCard v-for="node in filteredFlatNodes" :key="node.id" class="px-3 py-2">
            <CardContent class="p-0">
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">{{ node.url }}</p>
                  <p class="text-xs text-muted-foreground">
                    {{ node.id }} · {{ groupNameByID[node.group_id] ?? (node.group_id || 'No group') }} · {{ node.latency_ms }} ms
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
        </div>

        <div
          ref="loadMoreAnchor"
          class="h-10 text-center text-xs text-muted-foreground"
        >
          <span v-if="isFetchingNextPage">Loading more nodes...</span>
          <span v-else-if="hasNextPage">Scroll down to load more</span>
        </div>
      </div>

      <div v-if="showCreateGroupDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <UiCard class="w-full max-w-md p-6">
          <CardHeader><CardTitle>Create Group</CardTitle></CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <label class="text-sm font-medium">Name</label>
              <UiInput v-model="groupNameInput" placeholder="Group name" @keyup.enter="submitCreateGroup" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium">Source URL (optional)</label>
              <UiInput v-model="groupSourceURLInput" placeholder="https://example.com/subscription" />
            </div>
          </CardContent>
          <CardFooter class="flex justify-end gap-2">
            <UiButton variant="outline" @click="showCreateGroupDialog = false">Cancel</UiButton>
            <UiButton :disabled="!groupNameInput.trim() || isCreateGroupSubmitting" @click="submitCreateGroup">
              {{ isCreateGroupSubmitting ? 'Creating...' : 'Create' }}
            </UiButton>
          </CardFooter>
        </UiCard>
      </div>

      <div v-if="showCreateNodeDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <UiCard class="w-full max-w-md p-6">
          <CardHeader><CardTitle>Create Node</CardTitle></CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <label class="text-sm font-medium">VLESS URL</label>
              <UiInput v-model="nodeURLInput" placeholder="vless://uuid@host:443?..." @keyup.enter="submitCreateNode" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium">Group</label>
              <select v-model="nodeGroupIDInput" class="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="">No group</option>
                <option v-for="group in groups ?? []" :key="group.id" :value="group.id">{{ group.name }}</option>
              </select>
            </div>
          </CardContent>
          <CardFooter class="flex justify-end gap-2">
            <UiButton variant="outline" @click="showCreateNodeDialog = false">Cancel</UiButton>
            <UiButton :disabled="!nodeURLInput.trim() || isCreateNodeSubmitting" @click="submitCreateNode">
              {{ isCreateNodeSubmitting ? 'Creating...' : 'Create' }}
            </UiButton>
          </CardFooter>
        </UiCard>
      </div>
    </ClientOnly>
  </UiPageLayout>
</template>
