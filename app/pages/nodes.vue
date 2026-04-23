<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
import {
  ensureAdminRealtimeConnected,
  sendAdminRealtime,
  subscribeAdminRealtime,
} from '~/utils/admin-realtime'
import { countryBadgeLabel, normalizeCountryCode } from '~/utils/country'

definePageMeta({ layout: 'default' })

type ViewMode = 'grouped' | 'flat'
type StatusFilter = 'all' | 'healthy' | 'unhealthy' | 'unknown'
type PingFilter = 'all' | 'good' | 'ok' | 'bad'

interface PublicRefreshStateMessage {
  type: 'public_refresh_state'
  enabled?: boolean
  interval_ms?: number
  server_time?: string
  last_refresh_at?: string
  next_refresh_at?: string
  next_refresh_in_ms?: number
}

const queryClient = useQueryClient()
const config = useRuntimeConfig()
const baseURL = config.public.apiBase as string
const viewMode = ref<ViewMode>('grouped')

const {
  data: nodePages,
  isLoading: nodesLoading,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useInfiniteNodes(computed(() => viewMode.value === 'flat'))
const { data: groups, isLoading: groupsLoading } = useGroups()
/** Full-page skeleton: flat mode waits for global infinite list; grouped mode only waits for groups. */
const showInitialNodesShell = computed(
  () =>
    (groupsLoading.value && groups.value == null)
    || (viewMode.value === 'flat' && nodesLoading.value && nodePages.value == null),
)
const loadMoreAnchor = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
let stopLoadMoreAnchorWatch: (() => void) | null = null
let countdownIntervalID: ReturnType<typeof setInterval> | null = null
let stopRealtimeSubscription: (() => void) | null = null
const nowMS = ref(Date.now())

/** Nodes loaded via global infinite scroll (flat list / partial cache). */
const infiniteNodesFlat = computed<Node[]>(() =>
  nodePages.value?.pages.flatMap((page) => page.nodes) ?? [],
)

const search = ref('')
const statusFilter = ref<StatusFilter>('all')
const pingFilter = ref<PingFilter>('all')
/** Empty string means all countries. */
const countryFilter = ref('')

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
    queryClient.invalidateQueries({ queryKey: ['groups'] })
    showCreateNodeDialog.value = false
    nodeURLInput.value = ''
    nodeGroupIDInput.value = ''
  },
})

const deleteNodeMutation = useMutation({
  mutationFn: (id: string) => deleteNode(id, baseURL),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['nodes'] })
    queryClient.invalidateQueries({ queryKey: ['groups'] })
  },
})

const copiedNodeIDs = ref<Set<string>>(new Set())

const sourceGroups = computed(() =>
  (groups.value ?? []).filter((group) => Boolean(group.source_url?.trim()))
)

const sourceGroupCount = computed(() => sourceGroups.value.length)

const neverSyncedGroupCount = computed(() =>
  sourceGroups.value.filter((group) => !group.last_synced_at).length
)

const wsRefreshEnabled = ref(true)
const wsRefreshIntervalMS = ref<number | null>(null)
const wsLastRefreshAt = ref('')
const wsNextRefreshAt = ref('')

const nextRefreshAtMS = computed<number | null>(() => {
  if (!wsNextRefreshAt.value) return null
  const parsed = Date.parse(wsNextRefreshAt.value)
  return Number.isNaN(parsed) ? null : parsed
})

const nextURLGroupsRefreshInMS = computed<number | null>(() => {
  if (nextRefreshAtMS.value == null) return null
  return Math.max(nextRefreshAtMS.value - nowMS.value, 0)
})

const nextURLGroupsRefreshLabel = computed(() => {
  if (sourceGroupCount.value === 0) return 'No URL groups with source URL'
  if (!wsRefreshEnabled.value) return 'Auto refresh disabled'
  if (nextURLGroupsRefreshInMS.value == null) return 'Waiting for scheduler state from server'
  if (nextURLGroupsRefreshInMS.value === 0) return 'Next URL groups refresh is due'
  return `Next URL groups refresh in ${formatCountdown(nextURLGroupsRefreshInMS.value)}`
})

function formatCountdown(totalMS: number): string {
  const totalSeconds = Math.max(0, Math.floor(totalMS / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const probeNodeMutation = useMutation({
  mutationFn: (id: string) => probeNode(id, baseURL),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['nodes'] })
    queryClient.invalidateQueries({ queryKey: ['groups'] })
  },
})

const groupNameByID = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const group of groups.value ?? []) {
    map[group.id] = group.name
  }
  return map
})

const pingFilteredNodes = computed<Node[]>(() => {
  if (viewMode.value === 'grouped') return []
  const list = infiniteNodesFlat.value
  if (pingFilter.value === 'all') return list
  return list.filter((node) => matchesPingFilter(node.latency_ms, pingFilter.value))
})

const countryOptions = computed(() => {
  const set = new Set<string>()
  for (const n of pingFilteredNodes.value) {
    const c = normalizeCountryCode(n.country)
    if (c.length === 2) set.add(c)
  }
  return [...set].sort()
})

const countryFilteredNodes = computed<Node[]>(() => {
  const list = pingFilteredNodes.value
  const want = countryFilter.value.trim()
  if (!want) return list
  const target = normalizeCountryCode(want)
  return list.filter((n) => normalizeCountryCode(n.country) === target)
})

const filteredFlatNodes = computed<Node[]>(() => {
  const list = countryFilteredNodes.value
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

async function copyNodeURL(node: Node) {
  await navigator.clipboard.writeText(node.url)
  const next = new Set(copiedNodeIDs.value)
  next.add(node.id)
  copiedNodeIDs.value = next
  setTimeout(() => {
    const current = new Set(copiedNodeIDs.value)
    current.delete(node.id)
    copiedNodeIDs.value = current
  }, 1200)
}

function isUnavailable(status: Node['status']): boolean {
  return status === 'unknown' || status === 'unhealthy'
}

function latencyClass(latencyMS: number): string {
  if (latencyMS < 100) return 'text-emerald-600 dark:text-emerald-400'
  if (latencyMS <= 200) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function matchesPingFilter(latencyMS: number, filter: PingFilter): boolean {
  if (filter === 'good') return latencyMS < 100
  if (filter === 'ok') return latencyMS >= 100 && latencyMS <= 200
  if (filter === 'bad') return latencyMS > 200
  return true
}

function maybeLoadMore() {
  if (viewMode.value !== 'flat') return
  if (hasNextPage.value && !isFetchingNextPage.value) {
    fetchNextPage()
  }
}

function handlePublicRefreshStateMessage(msg: Record<string, unknown>) {
  if (msg.type !== 'public_refresh_state') return
  const state = msg as unknown as PublicRefreshStateMessage
  wsRefreshEnabled.value = state.enabled !== false
  wsRefreshIntervalMS.value = typeof state.interval_ms === 'number' ? state.interval_ms : null
  wsLastRefreshAt.value = typeof state.last_refresh_at === 'string' ? state.last_refresh_at : ''
  wsNextRefreshAt.value = typeof state.next_refresh_at === 'string' ? state.next_refresh_at : ''
}

onMounted(() => {
  ensureAdminRealtimeConnected()
  stopRealtimeSubscription = subscribeAdminRealtime(handlePublicRefreshStateMessage)
  sendAdminRealtime({ action: 'public_refresh_state' })

  countdownIntervalID = setInterval(() => {
    nowMS.value = Date.now()
  }, 1000)

  observer = new IntersectionObserver((entries) => {
    const hit = entries.some((entry) => entry.isIntersecting)
    if (hit) {
      maybeLoadMore()
    }
  }, { rootMargin: '250px 0px 250px 0px' })

  stopLoadMoreAnchorWatch = watch(
    loadMoreAnchor,
    (el) => {
      if (!observer) return
      observer.disconnect()
      if (el) {
        observer.observe(el)
      }
    },
    { flush: 'post', immediate: true },
  )
})

onBeforeUnmount(() => {
  stopRealtimeSubscription?.()
  stopRealtimeSubscription = null

  if (countdownIntervalID) {
    clearInterval(countdownIntervalID)
    countdownIntervalID = null
  }

  stopLoadMoreAnchorWatch?.()
  stopLoadMoreAnchorWatch = null
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
        <div class="rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <span class="font-medium text-foreground/90">Auto refresh:</span>
          {{ nextURLGroupsRefreshLabel }}
          <span v-if="wsLastRefreshAt">
            · Last refresh: {{ new Date(wsLastRefreshAt).toLocaleTimeString() }}
          </span>
          <span v-if="wsRefreshIntervalMS && wsRefreshIntervalMS > 0">
            · Interval: {{ formatCountdown(wsRefreshIntervalMS) }}
          </span>
          <span v-if="neverSyncedGroupCount > 0">
            · First sync pending: {{ neverSyncedGroupCount }}
          </span>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UiInput
            id="node-search"
            v-model="search"
            name="node-search"
            placeholder="Search by URL, ID, country, group..."
            class="max-w-md"
          />
          <select id="status-filter" v-model="statusFilter" name="status-filter" class="rounded-md border bg-background px-3 py-2 text-sm">
            <option value="all">All statuses</option>
            <option value="healthy">Healthy</option>
            <option value="unhealthy">Unhealthy</option>
            <option value="unknown">Unknown</option>
          </select>
          <select id="ping-filter" v-model="pingFilter" name="ping-filter" class="rounded-md border bg-background px-3 py-2 text-sm">
            <option value="all">All ping</option>
            <option value="good">Good (&lt; 100 ms)</option>
            <option value="ok">Ok (100-200 ms)</option>
            <option value="bad">Bad (&gt; 200 ms)</option>
          </select>
          <select id="country-filter" v-model="countryFilter" name="country-filter" class="rounded-md border bg-background px-3 py-2 text-sm">
            <option value="">All countries</option>
            <option v-for="c in countryOptions" :key="c" :value="c">{{ countryBadgeLabel(c) }}</option>
          </select>
        </div>

        <div v-if="showInitialNodesShell" class="py-8 text-center text-muted-foreground">
          Loading data...
        </div>

        <GroupAccordion
          v-else-if="viewMode === 'grouped'"
          :groups="groups ?? []"
          :search="search"
          :status-filter="statusFilter"
          :ping-filter="pingFilter"
          :country-filter="countryFilter"
        />

        <div v-else class="space-y-2">
          <UiCard v-for="node in filteredFlatNodes" :key="node.id" class="px-3 py-2">
            <CardContent class="p-0">
              <div class="flex items-center justify-between gap-2">
                <div class="max-w-[52%] min-w-0">
                  <div class="group relative min-w-0">
                    <p class="truncate text-sm font-medium">{{ node.url }}</p>
                    <div
                      class="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden max-h-48 w-[min(90vw,40rem)] overflow-y-auto whitespace-pre-wrap break-all rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md group-hover:block"
                    >
                      {{ node.url }}
                    </div>
                  </div>
                  <p class="text-xs text-muted-foreground">
                    {{ node.id }} · {{ groupNameByID[node.group_id] ?? (node.group_id || 'No group') }} ·
                    <span :class="latencyClass(node.latency_ms)">{{ node.latency_ms }} ms</span>
                    <span class="ml-1 inline-flex items-center rounded-full border border-border/80 bg-muted/40 px-2 py-0.5 tabular-nums">{{ countryBadgeLabel(node.country) }}</span>
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
                <div class="flex shrink-0 flex-nowrap gap-1">
                  <UiButton
                    variant="outline"
                    size="sm"
                    class="whitespace-nowrap"
                    @click="copyNodeURL(node)"
                  >
                    {{ copiedNodeIDs.has(node.id) ? 'Copied' : 'Copy' }}
                  </UiButton>
                  <UiButton
                    v-if="isUnavailable(node.status)"
                    variant="outline"
                    size="sm"
                    class="whitespace-nowrap"
                    :disabled="probingNodeIDs.has(node.id)"
                    @click="retryNode(node)"
                  >
                    {{ probingNodeIDs.has(node.id) ? 'Retrying...' : 'Retry' }}
                  </UiButton>
                  <UiButton
                    variant="destructive"
                    size="sm"
                    class="whitespace-nowrap"
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
          v-if="viewMode === 'flat'"
          ref="loadMoreAnchor"
          class="h-10 text-center text-xs text-muted-foreground"
        >
          <span v-if="isFetchingNextPage">Loading more nodes...</span>
        </div>
      </div>

      <div v-if="showCreateGroupDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <UiCard class="w-full max-w-md p-6">
          <CardHeader><CardTitle>Create Group</CardTitle></CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <label class="text-sm font-medium" for="create-group-name">Name</label>
              <UiInput id="create-group-name" v-model="groupNameInput" name="create-group-name" placeholder="Group name" @keyup.enter="submitCreateGroup" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium" for="create-group-source-url">Source URL (optional)</label>
              <UiInput
                id="create-group-source-url"
                v-model="groupSourceURLInput"
                name="create-group-source-url"
                placeholder="https://example.com/subscription"
              />
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
              <label class="text-sm font-medium" for="create-node-url">VLESS URL</label>
              <UiInput id="create-node-url" v-model="nodeURLInput" name="create-node-url" placeholder="vless://uuid@host:443?..." @keyup.enter="submitCreateNode" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium" for="create-node-group-id">Group</label>
              <select
                id="create-node-group-id"
                v-model="nodeGroupIDInput"
                name="create-node-group-id"
                class="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
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
