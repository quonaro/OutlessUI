<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Group } from '~/utils/schemas/group'
import type { Node, NodeStatus } from '~/utils/schemas/node'
import type { GroupStatusCounts } from '~/composables/groups/useGroupAccordionFilters'
import type { ProbeUnavailableNodeStatus } from '~/composables/groups/useGroupSync'
import { useGroupNodesInfinite } from '~/composables/nodes/useGroupNodesInfinite'
import UiButton from '~/components/ui/button/button.vue'
import UiCard from '~/components/ui/card/card.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import { countryBadgeLabel, normalizeCountryCode } from '~/utils/country'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import UiInput from '~/components/ui/input/input.vue'
import UiLabel from '~/components/ui/label/label.vue'
import { ArrowRight, Copy, MoreHorizontal, Plus, Pencil, RefreshCw, Trash2 } from 'lucide-vue-next'

type PingFilter = 'all' | 'good' | 'ok' | 'bad'
type StatusFilter = 'all' | 'healthy' | 'unhealthy' | 'unknown'
const defaultProbeStatuses: Array<'healthy' | 'unhealthy' | 'unknown'> = ['unknown', 'unhealthy', 'healthy']

const props = withDefaults(defineProps<{
  group: Group
  search: string
  statusFilter: StatusFilter
  pingFilter: PingFilter
  metrics: GroupStatusCounts
  isSyncing: boolean
  isCancelled: boolean
  syncError: string
  syncProgressPercent: number
  syncProcessedCount: number
  syncTotalCount: number
  syncInterrupted: boolean
  syncAddedCount: number
  deletedUnavailableCount: number
  togglingAutoDelete: boolean
  cleanupPending: boolean
  probeUnavailablePending: boolean
  probeUnavailableProcessedCount: number
  probeUnavailableTotalCount: number
  probeUnavailableActiveCount: number
  probeUnavailableRatePerSec: number
  probeUnavailableEtaSec: number | null
  probeStatuses: Array<'healthy' | 'unhealthy' | 'unknown'>
  probeMode: 'normal' | 'fast'
  probeUrl: string
  probeNodes: ProbeUnavailableNodeStatus[]
  probeInterrupted: boolean
  canProbeUnavailable: boolean
  deletingIds: Set<string>
  probingIds: Set<string>
  movingIds: Set<string>
  selectedIds: Set<string>
  allGroups: Group[]
  localHealthy: boolean
  localUnhealthy: boolean
  localUnknown: boolean
  syncNodeError: (nodeId: string) => string
  probeNodeState: (nodeId: string) => ProbeUnavailableNodeStatus | null
  editingGroup: boolean
  deletingGroup: boolean
}>(), { allGroups: () => [] })

const emit = defineEmits<{
  toggleLocalStatus: [status: NodeStatus, ev: Event]
  clearLocalFilter: [ev: Event]
  toggleAutoDelete: [checked: boolean]
  startSync: []
  cancelSync: []
  probeUnavailable: [options: { statuses: Array<'healthy' | 'unhealthy' | 'unknown'>, mode: 'normal' | 'fast', probeURL?: string }]
  deleteUnavailable: []
  removeNode: [node: Node]
  retryNode: [payload: { node: Node, mode: 'normal' | 'fast', probeURL?: string }]
  editGroup: [group: { id: string, name: string, source_url: string, random_enabled: boolean, random_limit: number | null }]
  deleteGroup: [groupId: string]
  addNode: [groupId: string]
  moveNode: [payload: { node: Node, targetGroupId: string }]
  toggleSelection: [nodeId: string]
  bulkMove: [targetGroupId: string]
  bulkDelete: []
  duplicateNode: [node: Node]
}>()

const copiedNodeIDs = ref<Set<string>>(new Set())
const probePanelOpen = ref(false)
const probeFormOpen = ref(false)
const probeStatusSelection = ref<Array<'healthy' | 'unhealthy' | 'unknown'>>([...defaultProbeStatuses])
const probeModeSelection = ref<'normal' | 'fast'>('normal')
const probeURLSelection = ref('')
const nodeProbeFormOpen = ref(false)
const nodeProbeTarget = ref<Node | null>(null)
const nodeProbeModeSelection = ref<'normal' | 'fast'>('normal')
const nodeProbeURLSelection = ref('')
const moveNodeDialogOpen = ref(false)
const moveNodeTarget = ref<Node | null>(null)
const moveTargetGroupId = ref('')
const bulkMoveDialogOpen = ref(false)
const bulkMoveTargetGroupId = ref('')
const accordionOpen = ref(false)
const editDialogOpen = ref(false)
const deleteDialogOpen = ref(false)
const editName = ref('')
const editSourceUrl = ref('')
const editRandomEnabled = ref(false)
const editRandomLimit = ref<string>('')
const canSaveEdit = computed(() => editName.value.trim().length > 0 && !props.editingGroup)

const accordionStorageKey = computed(() => `outless:nodes:group-accordion:${props.group.id}`)
const groupProbeFormStorageKey = computed(() => `outless:nodes:group-probe-form:${props.group.id}`)
const singleNodeProbeFormStorageKey = computed(() => `outless:nodes:group-single-probe-form:${props.group.id}`)

onMounted(() => {
  if (!import.meta.client) return
  const saved = localStorage.getItem(accordionStorageKey.value)
  if (saved === '1') accordionOpen.value = true
  if (saved === '0') accordionOpen.value = false

  const groupProbeRaw = localStorage.getItem(groupProbeFormStorageKey.value)
  if (groupProbeRaw) {
    try {
      const parsed = JSON.parse(groupProbeRaw) as { statuses?: unknown, mode?: unknown, probeURL?: unknown }
      if (Array.isArray(parsed.statuses)) {
        const normalized = normalizeProbeStatuses(parsed.statuses)
        if (normalized.length > 0) probeStatusSelection.value = normalized
      }
      probeModeSelection.value = parsed.mode === 'fast' ? 'fast' : 'normal'
      probeURLSelection.value = typeof parsed.probeURL === 'string' ? parsed.probeURL : ''
    } catch {
      // Ignore invalid localStorage payload and keep defaults.
    }
  }

  const singleProbeRaw = localStorage.getItem(singleNodeProbeFormStorageKey.value)
  if (singleProbeRaw) {
    try {
      const parsed = JSON.parse(singleProbeRaw) as { mode?: unknown, probeURL?: unknown }
      nodeProbeModeSelection.value = parsed.mode === 'fast' ? 'fast' : 'normal'
      nodeProbeURLSelection.value = typeof parsed.probeURL === 'string' ? parsed.probeURL : ''
    } catch {
      // Ignore invalid localStorage payload and keep defaults.
    }
  }
})

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
  () => props.probeStatuses,
  (value) => {
    probeStatusSelection.value = value.length > 0 ? [...value] : [...defaultProbeStatuses]
  },
  { immediate: true },
)

watch(
  () => props.probeMode,
  (value) => {
    probeModeSelection.value = value ?? 'normal'
  },
  { immediate: true },
)

watch(
  () => props.probeUrl,
  (value) => {
    probeURLSelection.value = value ?? ''
  },
  { immediate: true },
)

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

const probeNodesSorted = computed(() => {
  const rank = (s: ProbeUnavailableNodeStatus['status']) => {
    if (s === 'probing') return 0
    if (s === 'queued') return 1
    if (s === 'ready') return 2
    return 3
  }
  return [...props.probeNodes].sort((a, b) => rank(a.status) - rank(b.status))
})

function toggleProbeStatus(status: 'healthy' | 'unhealthy' | 'unknown') {
  const set = new Set(probeStatusSelection.value)
  if (set.has(status)) {
    if (set.size <= 1) return
    set.delete(status)
  } else {
    set.add(status)
  }
  probeStatusSelection.value = defaultProbeStatuses.filter((s) => set.has(s))
}

function handleProbeButtonClick() {
  if (props.probeUnavailablePending) {
    probePanelOpen.value = true
    return
  }
  probeFormOpen.value = true
}

function confirmProbeStart() {
  emit('probeUnavailable', {
    statuses: probeStatusSelection.value,
    mode: probeModeSelection.value,
    probeURL: probeURLSelection.value.trim(),
  })
  probeFormOpen.value = false
}

function openNodeProbeForm(node: Node) {
  nodeProbeTarget.value = node
  nodeProbeFormOpen.value = true
}

function confirmNodeProbe() {
  if (!nodeProbeTarget.value) return
  emit('retryNode', {
    node: nodeProbeTarget.value,
    mode: nodeProbeModeSelection.value,
    probeURL: nodeProbeURLSelection.value.trim(),
  })
  nodeProbeFormOpen.value = false
}

function onAccordionToggle(ev: Event) {
  const target = ev.currentTarget as HTMLDetailsElement | null
  if (!target) return
  accordionOpen.value = target.open
}

watch(accordionOpen, (value) => {
  if (!import.meta.client) return
  localStorage.setItem(accordionStorageKey.value, value ? '1' : '0')
})

watch([probeStatusSelection, probeModeSelection, probeURLSelection], ([statuses, mode, probeURL]) => {
  if (!import.meta.client) return
  localStorage.setItem(groupProbeFormStorageKey.value, JSON.stringify({ statuses, mode, probeURL }))
}, { deep: true })

watch([nodeProbeModeSelection, nodeProbeURLSelection], ([mode, probeURL]) => {
  if (!import.meta.client) return
  localStorage.setItem(singleNodeProbeFormStorageKey.value, JSON.stringify({ mode, probeURL }))
})

function normalizeProbeStatuses(raw: unknown[]): Array<'healthy' | 'unhealthy' | 'unknown'> {
  const allowed = new Set(['healthy', 'unhealthy', 'unknown'])
  const values = raw
    .map((v) => String(v).trim().toLowerCase())
    .filter((v): v is 'healthy' | 'unhealthy' | 'unknown' => allowed.has(v))
  const unique = new Set(values)
  const normalized = defaultProbeStatuses.filter((s) => unique.has(s))
  return normalized.length > 0 ? normalized : [...defaultProbeStatuses]
}

function formatProbeRate(ratePerSec: number): string {
  if (!Number.isFinite(ratePerSec) || ratePerSec <= 0) return '0.0 n/s'
  return `${ratePerSec.toFixed(1)} n/s`
}

function formatEta(etaSec: number | null): string {
  if (etaSec == null || etaSec < 0) return 'ETA --'
  const total = Math.max(0, Math.floor(etaSec))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `ETA ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function openEditDialog() {
  editName.value = props.group.name
  editSourceUrl.value = props.group.source_url ?? ''
  editRandomEnabled.value = props.group.random_enabled ?? false
  editRandomLimit.value = props.group.random_limit?.toString() ?? ''
  editDialogOpen.value = true
}

function confirmEdit() {
  emit('editGroup', {
    id: props.group.id,
    name: editName.value.trim(),
    source_url: editSourceUrl.value?.trim() || '',
    random_enabled: editRandomEnabled.value,
    random_limit: editRandomLimit.value ? parseInt(editRandomLimit.value) : null,
  })
  editDialogOpen.value = false
}

function openDeleteDialog() {
  deleteDialogOpen.value = true
}

function confirmDelete() {
  emit('deleteGroup', props.group.id)
  deleteDialogOpen.value = false
}

function openMoveNodeDialog(node: Node) {
  moveNodeTarget.value = node
  moveTargetGroupId.value = node.group_id ?? ''
  moveNodeDialogOpen.value = true
}

function confirmMoveNode() {
  if (!moveNodeTarget.value) return
  emit('moveNode', { node: moveNodeTarget.value, targetGroupId: moveTargetGroupId.value })
  moveNodeDialogOpen.value = false
  moveNodeTarget.value = null
  moveTargetGroupId.value = ''
}
function handleDuplicateNode() {
  if (!moveNodeTarget.value) return
  emit('duplicateNode', moveNodeTarget.value)
  moveNodeDialogOpen.value = false
  moveNodeTarget.value = null
  moveTargetGroupId.value = ''
}
function openBulkMoveDialog() {
  bulkMoveTargetGroupId.value = ''
  bulkMoveDialogOpen.value = true
}
function confirmBulkMove() {
  emit('bulkMove', bulkMoveTargetGroupId.value)
  bulkMoveDialogOpen.value = false
  bulkMoveTargetGroupId.value = ''
}
function handleBulkDuplicate() {
  emit('bulkMove', '')
  bulkMoveDialogOpen.value = false
  bulkMoveTargetGroupId.value = ''
}
function handleBulkDelete() {
  if (!confirm(`Delete ${props.selectedIds.size} selected nodes?`)) return
  emit('bulkDelete')
}
</script>

<template>
  <details class="rounded-md border bg-card" :open="accordionOpen" @toggle="onAccordionToggle">
    <summary class="cursor-pointer list-none bg-muted/25 px-4 py-3">
      <div class="flex min-w-0 items-start justify-between gap-2">
        <div class="min-w-0 flex-1">
          <p class="truncate font-medium">
            {{ props.group.name }} <span class="text-muted-foreground">({{ props.group.total_nodes }})</span>
          </p>
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <p class="truncate min-w-0">
              {{ props.group.source_url || 'Manual group' }}
            </p>
            <span class="flex items-center gap-2 shrink-0">
              <span class="flex items-center gap-1">
                <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                {{ props.metrics.healthy }}
              </span>
              <span class="flex items-center gap-1">
                <span class="h-2 w-2 rounded-full bg-red-500"></span>
                {{ props.metrics.unhealthy }}
              </span>
              <span class="flex items-center gap-1">
                <span class="h-2 w-2 rounded-full bg-amber-500"></span>
                {{ props.metrics.unknown }}
              </span>
            </span>
            <span v-if="props.group.last_synced_at" class="shrink-0"> · Last sync: {{ new Date(props.group.last_synced_at).toLocaleString() }}</span>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <UiButton variant="ghost" size="icon" class="h-8 w-8" @click.prevent="emit('addNode', props.group.id)">
            <Plus class="h-4 w-4" />
          </UiButton>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <UiButton variant="ghost" size="icon" class="h-8 w-8" @click.prevent>
                <MoreHorizontal class="h-4 w-4" />
              </UiButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem @click.prevent="openEditDialog" :disabled="props.editingGroup">
                <Pencil class="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem @click.prevent="emit('deleteUnavailable')" :disabled="props.cleanupPending">
                <Trash2 class="mr-2 h-4 w-4" />
                Delete unavailable
              </DropdownMenuItem>
              <DropdownMenuItem @click.prevent="handleProbeButtonClick" :disabled="(!props.canProbeUnavailable && !props.probeUnavailablePending) || props.isSyncing">
                <RefreshCw class="mr-2 h-4 w-4" />
                Check all
              </DropdownMenuItem>
              <DropdownMenuItem class="text-destructive focus:text-destructive" @click.prevent="openDeleteDialog" :disabled="props.deletingGroup">
                <Trash2 class="mr-2 h-4 w-4" />
                Delete group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </summary>
    <div class="flex items-center justify-end border-b border-border/80 bg-muted/25 px-4 py-2">
      <div v-if="props.selectedIds.size > 0" class="flex items-center gap-2">
        <span class="text-xs text-muted-foreground">{{ props.selectedIds.size }} selected</span>
        <UiButton size="sm" variant="outline" @click="openBulkMoveDialog">
          Move
        </UiButton>
        <UiButton size="sm" variant="destructive" @click="handleBulkDelete">
          Delete
        </UiButton>
      </div>
      <div v-else class="flex items-center gap-2">
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
        <UiButton v-if="props.isSyncing || props.probeUnavailablePending" size="sm" variant="outline" @click.prevent="emit('cancelSync')">Cancel</UiButton>
      </div>
    </div>

    <div
      v-if="props.isSyncing || props.syncInterrupted"
      class="flex items-center gap-2 border-b border-border/80 bg-muted/40 px-4 py-2.5"
    >
      <span class="text-xs font-medium text-muted-foreground">{{ props.isSyncing ? 'Load' : 'Load interrupted' }}</span>
      <span class="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 font-mono text-xs tabular-nums text-primary">
        {{ props.syncProgressPercent }}% · {{ props.syncProcessedCount }}/{{ props.syncTotalCount }}
      </span>
      <span class="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700">
        +{{ props.syncAddedCount }} new
      </span>
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
            :class="props.probingIds.has(node.id)
              ? 'border-blue-400/60 bg-blue-500/5'
              : isUnavailable(node.status)
                ? 'border-red-400/60 bg-red-500/5'
                : ''"
          >
            <CardContent class="p-0">
              <div class="flex items-center gap-2">
                <div class="min-w-0 flex-1">
                  <div class="group relative min-w-0 flex items-start gap-2">
                    <input
                      type="checkbox"
                      :checked="props.selectedIds.has(node.id)"
                      @change="emit('toggleSelection', node.id)"
                      class="mt-1 h-4 w-4 rounded border-input"
                    >
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium">{{ node.url }}</p>
                      <div
                        class="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden max-h-48 w-[min(90vw,40rem)] overflow-y-auto whitespace-pre-wrap break-all rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md group-hover:block"
                      >
                        {{ node.url }}
                      </div>
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
                    <span
                      v-else-if="props.probingIds.has(node.id)"
                      class="ml-2 rounded border border-blue-500/40 bg-blue-500/10 px-1.5 py-0.5 text-blue-700"
                    >
                      Checking
                    </span>
                  </p>
                </div>
                <div class="flex shrink-0 flex-nowrap items-center justify-end gap-1 whitespace-nowrap">
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <UiButton variant="ghost" size="icon" class="h-7 w-7" @click.prevent>
                        <MoreHorizontal class="h-3.5 w-3.5" />
                      </UiButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem @click.prevent="openMoveNodeDialog(node)" :disabled="props.movingIds.has(node.id)">
                        <ArrowRight class="mr-2 h-3.5 w-3.5" />
                        Move
                      </DropdownMenuItem>
                      <DropdownMenuItem @click.prevent="copyNodeURL(node)">
                        <Copy class="mr-2 h-3.5 w-3.5" />
                        Copy
                      </DropdownMenuItem>
                      <DropdownMenuItem @click.prevent="emit('retryNode', { node, mode: 'normal' })" :disabled="props.probingIds.has(node.id)">
                        <RefreshCw class="mr-2 h-3.5 w-3.5" />
                        {{ node.status === 'unknown' ? 'Check' : 'Retry' }}
                      </DropdownMenuItem>
                      <DropdownMenuItem class="text-destructive focus:text-destructive" @click.prevent="emit('removeNode', node)" :disabled="props.deletingIds.has(node.id)">
                        <Trash2 class="mr-2 h-3.5 w-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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

  <div v-if="probePanelOpen" class="fixed inset-0 z-40 flex justify-end bg-black/35" @click.self="probePanelOpen = false">
    <aside class="h-full w-[min(92vw,30rem)] border-l bg-background p-4 shadow-xl">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-semibold">Live checks · {{ props.group.name }}</h3>
        <UiButton size="sm" variant="outline" @click="probePanelOpen = false">Close</UiButton>
      </div>
      <p class="mb-3 text-xs text-muted-foreground">
        {{ props.probeUnavailableProcessedCount }}/{{ Math.max(props.probeUnavailableTotalCount, props.probeUnavailableProcessedCount) }}
      </p>
      <div class="max-h-[calc(100vh-7rem)] space-y-2 overflow-y-auto pr-1">
        <div v-for="item in probeNodesSorted" :key="item.node_id" class="rounded-md border bg-muted/25 p-2 text-xs">
          <div class="flex items-center justify-between gap-2">
            <span class="truncate font-medium">{{ item.node_id }}</span>
            <span class="rounded border px-1.5 py-0.5" :class="probeStateClass(item.status)">{{ probeStateLabel(item.status) }}</span>
          </div>
          <p class="truncate text-muted-foreground">{{ item.url }}</p>
          <p class="mt-1 text-muted-foreground">
            <span>latency: {{ item.latency_ms }} ms</span>
            <span v-if="item.node_status"> · {{ item.node_status }}</span>
            <span v-if="item.country"> · {{ countryBadgeLabel(item.country) }}</span>
            <span v-if="item.error" class="text-red-600"> · {{ item.error }}</span>
          </p>
        </div>
        <p v-if="probeNodesSorted.length === 0" class="py-6 text-center text-xs text-muted-foreground">No live checks yet</p>
      </div>
    </aside>
  </div>

  <div v-if="probeFormOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" @click.self="probeFormOpen = false">
    <div class="w-full max-w-md rounded-lg border bg-background p-4 shadow-xl">
      <h3 class="text-sm font-semibold">Check all settings</h3>
      <p class="mt-1 text-xs text-muted-foreground">{{ props.group.name }}</p>

      <div class="mt-4 space-y-2">
        <p class="text-xs font-medium text-foreground">Mode</p>
        <label class="flex items-center gap-2 text-xs">
          <input v-model="probeModeSelection" type="radio" value="normal">
          <span>Normal (with country detection)</span>
        </label>
        <label class="flex items-center gap-2 text-xs">
          <input v-model="probeModeSelection" type="radio" value="fast">
          <span>Fast (without country detection)</span>
        </label>
      </div>

      <div class="mt-4 space-y-2">
        <p class="text-xs font-medium text-foreground">Probe URL</p>
        <input
          v-model="probeURLSelection"
          type="text"
          placeholder="Leave empty to use server default"
          class="w-full rounded-md border bg-background px-2 py-1 text-xs"
        >
      </div>

      <div class="mt-4 space-y-2">
        <p class="text-xs font-medium text-foreground">Statuses to check</p>
        <label class="flex items-center gap-2 text-xs">
          <input type="checkbox" :checked="probeStatusSelection.includes('unknown')" @change="toggleProbeStatus('unknown')">
          <span>Unknown</span>
        </label>
        <label class="flex items-center gap-2 text-xs">
          <input type="checkbox" :checked="probeStatusSelection.includes('unhealthy')" @change="toggleProbeStatus('unhealthy')">
          <span>Unhealthy</span>
        </label>
        <label class="flex items-center gap-2 text-xs">
          <input type="checkbox" :checked="probeStatusSelection.includes('healthy')" @change="toggleProbeStatus('healthy')">
          <span>Healthy</span>
        </label>
      </div>

      <div class="mt-5 flex items-center justify-end gap-2">
        <UiButton size="sm" variant="outline" @click="probeFormOpen = false">Cancel</UiButton>
        <UiButton size="sm" :disabled="probeStatusSelection.length === 0" @click="confirmProbeStart">Check!</UiButton>
      </div>
    </div>
  </div>

  <div v-if="nodeProbeFormOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" @click.self="nodeProbeFormOpen = false">
    <div class="w-full max-w-md rounded-lg border bg-background p-4 shadow-xl">
      <h3 class="text-sm font-semibold">Node check settings</h3>
      <p class="mt-1 truncate text-xs text-muted-foreground">{{ nodeProbeTarget?.id }} · {{ nodeProbeTarget?.url }}</p>

      <div class="mt-4 space-y-2">
        <p class="text-xs font-medium text-foreground">Mode</p>
        <label class="flex items-center gap-2 text-xs">
          <input v-model="nodeProbeModeSelection" type="radio" value="normal">
          <span>Normal (with country detection)</span>
        </label>
        <label class="flex items-center gap-2 text-xs">
          <input v-model="nodeProbeModeSelection" type="radio" value="fast">
          <span>Fast (without country detection)</span>
        </label>
      </div>

      <div class="mt-4 space-y-2">
        <p class="text-xs font-medium text-foreground">Probe URL</p>
        <input
          v-model="nodeProbeURLSelection"
          type="text"
          placeholder="Leave empty to use server default"
          class="w-full rounded-md border bg-background px-2 py-1 text-xs"
        >
      </div>

      <div class="mt-4 space-y-2">
        <p class="text-xs font-medium text-foreground">Statuses to check</p>
        <p class="text-xs text-muted-foreground">Single-node check targets current node status only.</p>
      </div>

      <div class="mt-5 flex items-center justify-end gap-2">
        <UiButton size="sm" variant="outline" @click="nodeProbeFormOpen = false">Cancel</UiButton>
        <UiButton size="sm" @click="confirmNodeProbe">Check!</UiButton>
      </div>
    </div>
  </div>

  <!-- Edit Group Dialog -->
  <Dialog v-model:open="editDialogOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit Group</DialogTitle>
        <DialogDescription>
          Change the group name and public URL.
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <UiLabel for="edit-name">Name</UiLabel>
          <UiInput
            id="edit-name"
            v-model="editName"
            placeholder="Group name"
          />
        </div>
        <div class="space-y-2">
          <UiLabel for="edit-source-url">Public URL</UiLabel>
          <UiInput
            id="edit-source-url"
            v-model="editSourceUrl"
            placeholder="https://example.com/nodes.txt"
          />
        </div>
        <div class="flex items-center gap-2">
          <input
            id="edit-random-enabled"
            v-model="editRandomEnabled"
            type="checkbox"
            class="h-4 w-4 rounded border-input"
          >
          <label for="edit-random-enabled" class="text-sm">Random selection for subscriptions</label>
        </div>
        <div class="space-y-2">
          <UiLabel for="edit-random-limit">Limit (optional)</UiLabel>
          <UiInput
            id="edit-random-limit"
            v-model="editRandomLimit"
            type="number"
            min="1"
            placeholder="Max nodes to return"
          />
          <p class="text-xs text-muted-foreground">Maximum number of nodes to return in subscriptions</p>
        </div>
      </div>
      <DialogFooter>
        <UiButton variant="outline" @click="editDialogOpen = false">Cancel</UiButton>
        <UiButton @click="confirmEdit" :disabled="!canSaveEdit">
          {{ props.editingGroup ? 'Saving...' : 'Save' }}
        </UiButton>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Delete Group Dialog -->
  <Dialog :open="deleteDialogOpen" @update:open="deleteDialogOpen = $event">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Delete group</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete group "{{ props.group.name }}"? This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <UiButton variant="outline" @click="deleteDialogOpen = false">Cancel</UiButton>
        <UiButton variant="destructive" @click="confirmDelete" :disabled="props.deletingGroup">
          Delete
        </UiButton>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <Dialog :open="moveNodeDialogOpen" @update:open="moveNodeDialogOpen = $event">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Move node</DialogTitle>
        <DialogDescription>
          Select target group to move this node.
        </DialogDescription>
      </DialogHeader>
      <div class="py-4">
        <UiLabel for="move-target-group">Target group</UiLabel>
        <select id="move-target-group" v-model="moveTargetGroupId" class="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm">
          <option value="">No group</option>
          <option v-for="g in props.allGroups" :key="g.id" :value="g.id">{{ g.name }}</option>
        </select>
      </div>
      <DialogFooter>
        <UiButton variant="outline" @click="handleDuplicateNode">Duplicate</UiButton>
        <UiButton variant="outline" @click="moveNodeDialogOpen = false">Cancel</UiButton>
        <UiButton @click="confirmMoveNode">Move</UiButton>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <Dialog :open="bulkMoveDialogOpen" @update:open="bulkMoveDialogOpen = $event">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Move selected nodes</DialogTitle>
        <DialogDescription>
          Select target group to move {{ props.selectedIds.size }} selected nodes.
        </DialogDescription>
      </DialogHeader>
      <div class="py-4">
        <UiLabel for="bulk-move-target-group">Target group</UiLabel>
        <select id="bulk-move-target-group" v-model="bulkMoveTargetGroupId" class="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm">
          <option value="">No group</option>
          <option v-for="g in props.allGroups" :key="g.id" :value="g.id">{{ g.name }}</option>
        </select>
      </div>
      <DialogFooter>
        <UiButton variant="outline" @click="handleBulkDuplicate">Duplicate</UiButton>
        <UiButton variant="outline" @click="bulkMoveDialogOpen = false">Cancel</UiButton>
        <UiButton @click="confirmBulkMove">Move</UiButton>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
