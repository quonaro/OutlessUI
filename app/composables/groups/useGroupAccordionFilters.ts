import { computed, ref, type ComputedRef } from 'vue'
import type { Group } from '~/utils/schemas/group'
import type { Node, NodeStatus } from '~/utils/schemas/node'

export type GlobalStatusFilter = 'all' | NodeStatus

export interface GroupStatusCounts {
  healthy: number
  unhealthy: number
  unknown: number
  total: number
}

export interface UseGroupAccordionFiltersOptions {
  groups: ComputedRef<Group[]> | (() => Group[])
  nodes: ComputedRef<Node[]> | (() => Node[])
  search: ComputedRef<string> | (() => string)
  statusFilter: ComputedRef<GlobalStatusFilter> | (() => GlobalStatusFilter)
  /** When true, nodes are loaded per group in child components — parent passes an empty node list; visibility uses group metadata + search on group fields only. */
  perGroupNodeSource?: ComputedRef<boolean> | (() => boolean)
}

function resolve<T>(r: ComputedRef<T> | (() => T)): T {
  return typeof r === 'function' ? (r as () => T)() : r.value
}

function matchesGlobalFilter(filter: GlobalStatusFilter, node: Node): boolean {
  return filter === 'all' ? true : node.status === filter
}

function matchesSearch(search: string, node: Node): boolean {
  if (!search) return true
  const hay = `${node.url} ${node.id} ${node.country}`.toLowerCase()
  return hay.includes(search)
}

function statusSortRank(status: NodeStatus): number {
  if (status === 'healthy') return 0
  if (status === 'unknown') return 1
  return 2
}

export function useGroupAccordionFilters(opts: UseGroupAccordionFiltersOptions) {
  const localStatusesByGroup = ref<Record<string, NodeStatus[]>>({})

  const nodes = computed(() => resolve(opts.nodes))
  const groups = computed(() => resolve(opts.groups))
  const normalizedSearch = computed(() => resolve(opts.search).trim().toLowerCase())
  const globalStatusFilter = computed(() => resolve(opts.statusFilter))
  const perGroupNodeSource = computed(() =>
    opts.perGroupNodeSource ? resolve(opts.perGroupNodeSource) : false,
  )

  const nodesByGroup = computed(() => {
    const map: Record<string, Node[]> = {}
    for (const node of nodes.value) {
      const key = node.group_id || '__ungrouped__'
      if (!map[key]) map[key] = []
      map[key].push(node)
    }
    return map
  })

  const baseFilteredNodesForGroup = computed(() => {
    const search = normalizedSearch.value
    const gf = globalStatusFilter.value
    const out: Record<string, Node[]> = {}
    for (const group of groups.value) {
      if (perGroupNodeSource.value) {
        out[group.id] = []
        continue
      }
      const source = nodesByGroup.value[group.id] ?? []
      out[group.id] = source.filter((node) => {
        if (!matchesGlobalFilter(gf, node)) return false
        return matchesSearch(search, node)
      })
    }
    return out
  })

  const visibleGroups = computed(() => {
    const search = normalizedSearch.value
    return groups.value.filter((group) => {
      if (perGroupNodeSource.value) {
        if (!search) return true
        if (group.name.toLowerCase().includes(search)) return true
        if ((group.source_url ?? '').toLowerCase().includes(search)) return true
        return true
      }
      const filteredNodes = baseFilteredNodesForGroup.value[group.id] ?? []
      if (!search) return true
      if (group.name.toLowerCase().includes(search)) return true
      if ((group.source_url ?? '').toLowerCase().includes(search)) return true
      return filteredNodes.length > 0
    })
  })

  function selectedLocalStatuses(groupId: string): NodeStatus[] {
    return localStatusesByGroup.value[groupId] ?? []
  }

  function toggleLocalStatus(groupId: string, status: NodeStatus, ev?: Event) {
    ev?.stopPropagation()
    ev?.preventDefault()
    const cur = new Set(selectedLocalStatuses(groupId))
    if (cur.has(status)) cur.delete(status)
    else cur.add(status)
    const nextArr = [...cur] as NodeStatus[]
    const next = { ...localStatusesByGroup.value }
    if (nextArr.length === 0) delete next[groupId]
    else next[groupId] = nextArr
    localStatusesByGroup.value = next
  }

  function isLocalStatusActive(groupId: string, status: NodeStatus): boolean {
    return selectedLocalStatuses(groupId).includes(status)
  }

  function clearLocalStatusFilter(groupId: string, ev?: Event) {
    ev?.stopPropagation()
    ev?.preventDefault()
    if (!(groupId in localStatusesByGroup.value)) return
    const next = { ...localStatusesByGroup.value }
    delete next[groupId]
    localStatusesByGroup.value = next
  }

  function matchesLocalMultiFilter(groupId: string, node: Node): boolean {
    const sel = selectedLocalStatuses(groupId)
    if (sel.length === 0) return true
    return sel.includes(node.status)
  }

  function statusMetricsForGroup(groupId: string): GroupStatusCounts {
    const group = groups.value.find((g) => g.id === groupId)
    if (!group) {
      return { healthy: 0, unhealthy: 0, unknown: 0, total: 0 }
    }
    return {
      healthy: group.healthy_nodes,
      unhealthy: group.unhealthy_nodes,
      unknown: group.unknown_nodes,
      total: group.total_nodes,
    }
  }

  function visibleNodesForGroup(group: Group): Node[] {
    const list = baseFilteredNodesForGroup.value[group.id] ?? []
    return list
      .filter((node) => matchesLocalMultiFilter(group.id, node))
      .sort((a, b) => statusSortRank(a.status) - statusSortRank(b.status))
  }

  return {
    normalizedSearch,
    nodesByGroup,
    visibleGroups,
    visibleNodesForGroup,
    statusMetricsForGroup,
    toggleLocalStatus,
    isLocalStatusActive,
    clearLocalStatusFilter,
  }
}
