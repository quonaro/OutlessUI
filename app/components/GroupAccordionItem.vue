<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Group } from '~/utils/schemas/group'
import type { Node, NodeStatus } from '~/utils/schemas/node'
import type { GroupStatusCounts } from '~/composables/groups/useGroupAccordionFilters'
import type { ProbeUnavailableNodeStatus } from '~/composables/groups/useGroupSync'
import { useGroupNodesInfinite } from '~/composables/nodes/useGroupNodesInfinite'
import UiButton from '~/components/ui/button/button.vue'
import UiCard from '~/components/ui/card/card.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import { countryBadgeLabel, normalizeCountryCode } from '~/utils/country'

type PingFilter = 'all' | 'good' | 'ok' | 'bad'
type StatusFilter = 'all' | 'healthy' | 'unhealthy' | 'unknown'

const props = withDefaults(defineProps<{
  group: Group
  search: string
  statusFilter: StatusFilter
  pingFilter: PingFilter
  countryFilter: string
  metrics: GroupStatusCounts
  isSyncing: boolean
  isCancelled: boolean
  syncError: string
  syncProgressPercent: number
  syncProcessedCount: number
  syncTotalCount: number
  syncAddedCount: number
  deletedUnavailableCount: number
  togglingAutoDelete: boolean
  cleanupPending: boolean
  probeUnavailablePending: boolean
  probeUnavailableProcessedCount: number
  probeUnavailableTotalCount: number
  canProbeUnavailable: boolean
  deletingIds: Set<string>
  probingIds: Set<string>
  localHealthy: boolean
  localUnhealthy: boolean
  localUnknown: boolean
  syncNodeError: (nodeId: string) => string
  probeNodeState: (nodeId: string) => ProbeUnavailableNodeStatus | null
}>(), {})

const emit = defineEmits<{
  toggleLocalStatus: [status: NodeStatus, ev: Event]
  clearLocalFilter: [ev: Event]
  toggleAutoDelete: [checked: boolean]
  startSync: []
  cancelSync: []
  probeUnavailable: []
  deleteUnavailable: []
  removeNode: [node: Node]
  retryNode: [node: Node]
}>()

const copiedNodeIDs = ref<Set<string>>(new Set())

const {
  data: nodePages,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
} = useGroupNodesInfinite(() => props.group.id)

const allNodesInGroup = computed(() =>
  nodePages.value?.pages.flatMap((p) => p.nodes) ?? [],
)

function statusSortRank(status: NodeStatus): number {
  if (status === 'healthy') return 0
  if (status === 'unknown') return 1
  return 2
}

function matchesPingFilter(latencyMS: number, filter: PingFilter): boolean {
  if (filter === 'good') return latencyMS < 100
  if (filter === 'ok') return latencyMS >= 100 && latencyMS <= 200
  if (filter === 'bad') return latencyMS > 200
  return true
}

const localStatusSelection = computed<NodeStatus[]>(() => {
  const s: NodeStatus[] = []
  if (props.localHealthy) s.push('healthy')
  if (props.localUnhealthy) s.push('unhealthy')
  if (props.localUnknown) s.push('unknown')
  return s
})

const displayNodes = computed(() => {
  let list = allNodesInGroup.value
  if (props.statusFilter !== 'all') {
    list = list.filter((n) => n.status === props.statusFilter)
  }
  const q = props.search.trim().toLowerCase()
  if (q) {
    list = list.filter((n) =>
      `${n.url} ${n.id} ${n.country}`.toLowerCase().includes(q),
    )
  }
  list = list.filter((n) => matchesPingFilter(n.latency_ms, props.pingFilter))
  const want = props.countryFilter.trim()
  if (want) {
    const t = normalizeCountryCode(want)
    list = list.filter((n) => normalizeCountryCode(n.country) === t)
  }
  const ls = localStatusSelection.value
  if (ls.length > 0) {
    list = list.filter((n) => ls.includes(n.status))
  }
  return [...list].sort((a, b) => statusSortRank(a.status) - statusSortRank(b.status))
})

const scrollRoot = ref<HTMLElement | null>(null)
const loadSentinel = ref<HTMLElement | null>(null)
let listObserver: IntersectionObserver | null = null

function maybeLoadMoreInList() {
  if (!hasNextPage.value || isFetchingNextPage.value) return
  void fetchNextPage()
}

watch(
  [scrollRoot, loadSentinel, () => hasNextPage.value],
  () => {
    listObserver?.disconnect()
    listObserver = null
    const root = scrollRoot.value
    const target = loadSentinel.value
    if (!root || !target) return
    listObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          maybeLoadMoreInList()
        }
      },
      { root, rootMargin: '160px 0px 160px 0px', threshold: 0 },
    )
    listObserver.observe(target)
  },
  { flush: 'post' },
)

onBeforeUnmount(() => {
  listObserver?.disconnect()
  listObserver = null
})

function statusChipClass(status: NodeStatus, active: boolean): string {
  const base = 'rounded-full border px-2 py-0.5 text-xs font-medium transition-colors'
  const activeRing = active ? 'ring-2 ring-offset-1 ring-offset-background ring-primary' : ''
  if (status === 'healthy') return `${base} ${activeRing} border-emerald-500/40 bg-emerald-500/15 text-emerald-700`
  if (status === 'unhealthy') return `${base} ${activeRing} border-red-500/40 bg-red-500/15 text-red-700`
  return `${base} ${activeRing} border-amber-500/40 bg-amber-500/15 text-amber-700`
}

function totalChipClass(): string {
  return 'rounded-full border border-border/80 bg-background/90 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground'
}

function isUnavailable(status: Node['status']): boolean {
  return status === 'unknown' || status === 'unhealthy'
}

function latencyBadgeClass(latencyMS: number): string {
  if (latencyMS < 100) return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700'
  if (latencyMS <= 200) return 'border-amber-500/40 bg-amber-500/15 text-amber-700'
  return 'border-red-500/40 bg-red-500/15 text-red-700'
}

function probeStateLabel(status: ProbeUnavailableNodeStatus['status']): string {
  if (status === 'queued') return 'Waiting'
  if (status === 'probing') return 'Checking'
  if (status === 'ready') return 'Ready'
  return 'Error'
}

function probeStateClass(status: ProbeUnavailableNodeStatus['status']): string {
  if (status === 'queued') return 'border-slate-500/40 bg-slate-500/15 text-slate-700'
  if (status === 'probing') return 'border-blue-500/40 bg-blue-500/15 text-blue-700'
  if (status === 'ready') return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700'
  return 'border-red-500/40 bg-red-500/15 text-red-700'
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

const emptyMessage = computed(() => {
  if (isLoading.value && allNodesInGroup.value.length === 0) return 'Loading nodes…'
  if (allNodesInGroup.value.length === 0) return 'No nodes in this group'
  return 'No nodes match the current filters'
})
</script>

<template>
  <details class="rounded-md border bg-card">
    <summary class="cursor-pointer list-none bg-muted/25 px-4 py-3">
      <div class="min-w-0">
        <p class="truncate font-medium">
          {{ props.group.name }} <span class="text-muted-foreground">({{ props.group.total_nodes }})</span>
        </p>
        <p class="truncate text-xs text-muted-foreground">
          {{ props.group.source_url || 'Manual group' }}
          <span v-if="props.group.last_synced_at"> · Last sync: {{ new Date(props.group.last_synced_at).toLocaleString() }}</span>
        </p>
      </div>
    </summary>
    <div class="flex items-center justify-end border-b border-border/80 bg-muted/25 px-4 py-2">
      <label class="flex items-center gap-1 text-xs text-muted-foreground" :for="`auto-delete-${props.group.id}`">
        <input
          :id="`auto-delete-${props.group.id}`"
          :name="`auto-delete-${props.group.id}`"
          type="checkbox"
          :checked="props.group.auto_delete_unavailable"
          :disabled="props.togglingAutoDelete"
          @change="emit('toggleAutoDelete', ($event.target as HTMLInputElement).checked)"
        >
        Auto-delete unavailable
      </label>
    </div>

    <div
      class="flex flex-wrap items-center gap-2 border-b border-border/80 bg-muted/40 px-4 py-2.5"
      :class="props.isSyncing ? 'justify-between' : 'justify-end'"
    >
      <div v-if="props.isSyncing" class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <span class="text-xs font-medium text-muted-foreground">Load</span>
        <span class="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 font-mono text-xs tabular-nums text-primary">
          {{ props.syncProgressPercent }}% · {{ props.syncProcessedCount }}/{{ props.syncTotalCount }}
        </span>
        <span class="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700">
          +{{ props.syncAddedCount }} new
        </span>
      </div>
      <div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
        <UiButton v-if="Boolean(props.group.source_url?.trim())" size="sm" variant="outline" :disabled="props.probeUnavailablePending || props.isSyncing" @click.prevent="emit('startSync')">
          {{ props.isSyncing ? 'Loading...' : 'Load' }}
        </UiButton>
        <UiButton size="sm" variant="outline" :disabled="!props.canProbeUnavailable || props.isSyncing || props.probeUnavailablePending" @click.prevent="emit('probeUnavailable')">
          {{ props.probeUnavailablePending ? `Checking... ${props.probeUnavailableProcessedCount}/${Math.max(props.probeUnavailableTotalCount, props.probeUnavailableProcessedCount)}` : 'Check all' }}
        </UiButton>
        <UiButton v-if="props.isSyncing || props.probeUnavailablePending" size="sm" variant="outline" @click.prevent="emit('cancelSync')">Cancel check</UiButton>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-muted/35 px-4 py-2.5">
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <button
          type="button"
          :class="statusChipClass('healthy', props.localHealthy)"
          @click="emit('toggleLocalStatus', 'healthy', $event)"
        >
          healthy {{ props.metrics.healthy }}
        </button>
        <button
          type="button"
          :class="statusChipClass('unhealthy', props.localUnhealthy)"
          @click="emit('toggleLocalStatus', 'unhealthy', $event)"
        >
          unhealthy {{ props.metrics.unhealthy }}
        </button>
        <button
          type="button"
          :class="statusChipClass('unknown', props.localUnknown)"
          @click="emit('toggleLocalStatus', 'unknown', $event)"
        >
          unknown {{ props.metrics.unknown }}
        </button>
        <button
          type="button"
          :class="totalChipClass()"
          title="Clear status filter"
          @click="emit('clearLocalFilter', $event)"
        >
          total {{ props.metrics.total }}
        </button>
      </div>
      <UiButton
        variant="destructive"
        size="sm"
        class="shrink-0"
        :disabled="props.cleanupPending"
        @click.prevent="emit('deleteUnavailable')"
      >
        {{ props.cleanupPending ? 'Deleting...' : 'Delete unavailable' }}
      </UiButton>
    </div>

    <CardContent class="border-t px-0 py-0">
      <div v-if="props.isCancelled || props.deletedUnavailableCount > 0" class="flex flex-wrap items-center gap-2 px-4 pt-3">
        <p v-if="props.isCancelled" class="text-xs text-amber-600">Sync cancelled</p>
        <p v-else-if="props.deletedUnavailableCount > 0" class="text-xs text-muted-foreground">
          Auto-deleted: {{ props.deletedUnavailableCount }}
        </p>
      </div>

      <p v-if="props.syncError" class="px-4 pt-2 text-xs text-red-500">
        {{ props.syncError }}
      </p>

      <div
        ref="scrollRoot"
        class="max-h-[min(70vh,28rem)] overflow-y-auto overscroll-contain rounded-md border border-border/60 bg-muted/20 px-4 py-3 pr-2 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.45)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-600/60 hover:[&::-webkit-scrollbar-thumb]:bg-zinc-500/80"
      >
        <div class="space-y-2">
          <UiCard
            v-for="node in displayNodes"
            :key="node.id"
            class="px-3 py-2"
            :class="isUnavailable(node.status) ? 'border-red-400/60 bg-red-500/5' : ''"
          >
            <CardContent class="p-0">
              <div class="flex items-center gap-2">
                <div class="min-w-0 flex-1">
                  <div class="group relative min-w-0">
                    <p class="truncate text-sm font-medium">{{ node.url }}</p>
                    <div
                      class="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden max-h-48 w-[min(90vw,40rem)] overflow-y-auto whitespace-pre-wrap break-all rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md group-hover:block"
                    >
                      {{ node.url }}
                    </div>
                  </div>
                  <p class="text-xs text-muted-foreground">
                    {{ node.id }}
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
                    <span
                      class="ml-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums"
                      :class="latencyBadgeClass(node.latency_ms)"
                    >
                      {{ node.latency_ms }} ms
                    </span>
                    <span
                      class="ml-2 inline-flex items-center rounded-full border border-border/80 bg-muted/35 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground"
                    >
                      {{ countryBadgeLabel(props.probeNodeState(node.id)?.country ?? node.country) }}
                    </span>
                    <span v-if="props.syncNodeError(node.id)" class="ml-2 text-red-600">
                      {{ props.syncNodeError(node.id) }}
                    </span>
                    <span
                      v-if="props.probeNodeState(node.id)"
                      class="ml-2 rounded border px-1.5 py-0.5"
                      :class="probeStateClass(props.probeNodeState(node.id)!.status)"
                    >
                      {{ probeStateLabel(props.probeNodeState(node.id)!.status) }}
                    </span>
                  </p>
                </div>
                <div class="flex shrink-0 flex-nowrap items-center justify-end gap-1 whitespace-nowrap">
                  <UiButton
                    variant="outline"
                    size="sm"
                    class="whitespace-nowrap"
                    @click="copyNodeURL(node)"
                  >
                    {{ copiedNodeIDs.has(node.id) ? 'Copied' : 'Copy' }}
                  </UiButton>
                  <UiButton
                    v-if="node.status === 'healthy'"
                    variant="outline"
                    size="sm"
                    class="whitespace-nowrap"
                    :disabled="props.probingIds.has(node.id)"
                    @click="emit('retryNode', node)"
                  >
                    {{ props.probingIds.has(node.id) ? 'Rechecking...' : 'Recheck' }}
                  </UiButton>
                  <UiButton
                    v-if="isUnavailable(node.status)"
                    variant="outline"
                    size="sm"
                    class="whitespace-nowrap"
                    :disabled="props.probingIds.has(node.id)"
                    @click="emit('retryNode', node)"
                  >
                    {{ props.probingIds.has(node.id) ? 'Retrying...' : 'Retry' }}
                  </UiButton>
                  <UiButton
                    variant="destructive"
                    size="sm"
                    class="whitespace-nowrap"
                    :disabled="props.deletingIds.has(node.id)"
                    @click="emit('removeNode', node)"
                  >
                    {{ props.deletingIds.has(node.id) ? 'Deleting...' : 'Delete' }}
                  </UiButton>
                </div>
              </div>
            </CardContent>
          </UiCard>

          <div ref="loadSentinel" class="h-2 shrink-0" aria-hidden="true" />

          <p v-if="isFetchingNextPage" class="py-1 text-center text-xs text-muted-foreground">
            Loading more…
          </p>

          <p
            v-if="displayNodes.length === 0"
            class="py-6 text-center text-sm text-muted-foreground"
          >
            {{ emptyMessage }}
          </p>
        </div>
      </div>
    </CardContent>
  </details>
</template>
