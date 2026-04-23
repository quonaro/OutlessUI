<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import type { CreateNode, Node, UpdateNode } from '~/utils/schemas/node'
import { useNodes } from '~/composables/nodes/useNodes'
import { useCreateNode } from '~/composables/nodes/useCreateNode'
import { useUpdateNode } from '~/composables/nodes/useUpdateNode'
import { useDeleteNode } from '~/composables/nodes/useDeleteNode'
import { useGroups } from '~/composables/groups/useGroups'
import UiButton from '~/components/ui/button/button.vue'
import UiInput from '~/components/ui/input/input.vue'
import UiCard from '~/components/ui/card/card.vue'
import CardHeader from '~/components/ui/card/CardHeader.vue'
import CardTitle from '~/components/ui/card/CardTitle.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import CardFooter from '~/components/ui/card/CardFooter.vue'

const queryClient = useQueryClient()

const { data: nodes, isLoading } = useNodes()
const { data: groups } = useGroups()

const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const selectedNode = ref<Node | null>(null)
const nodeUrl = ref('')
const nodeGroupId = ref('')
const filterGroupId = ref<string>('')

const invalidate = () => queryClient.invalidateQueries({ queryKey: ['nodes'] })

const createMutation = useCreateNode({
  onSuccess: () => {
    showCreateDialog.value = false
    resetForm()
    invalidate()
  },
})

const updateMutation = useUpdateNode({
  onSuccess: () => {
    showEditDialog.value = false
    resetForm()
    invalidate()
  },
})

const deleteMutation = useDeleteNode({
  onSuccess: invalidate,
})

const visibleNodes = computed<Node[]>(() => {
  const list = nodes.value ?? []
  if (!filterGroupId.value) return list
  return list.filter((n) => n.group_id === filterGroupId.value)
})

const groupNameById = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const group of groups.value ?? []) {
    map[group.id] = group.name
  }
  return map
})

function resetForm() {
  nodeUrl.value = ''
  nodeGroupId.value = ''
  selectedNode.value = null
}

function openCreateDialog() {
  resetForm()
  if (groups.value && groups.value.length > 0) {
    nodeGroupId.value = groups.value[0].id
  }
  showCreateDialog.value = true
}

function openEditDialog(node: Node) {
  selectedNode.value = node
  nodeUrl.value = node.url
  nodeGroupId.value = node.group_id
  showEditDialog.value = true
}

function handleCreate() {
  if (!nodeUrl.value.trim() || !nodeGroupId.value) return
  const payload: CreateNode = {
    url: nodeUrl.value.trim(),
    group_id: nodeGroupId.value,
  }
  createMutation.mutate(payload)
}

function handleUpdate() {
  if (!selectedNode.value || !nodeUrl.value.trim() || !nodeGroupId.value) return
  const payload: UpdateNode = {
    url: nodeUrl.value.trim(),
    group_id: nodeGroupId.value,
  }
  updateMutation.mutate({ id: selectedNode.value.id, ...payload })
}

function handleDelete(node: Node) {
  if (!confirm(`Delete node ${node.url}?`)) return
  deleteMutation.mutate(node.id)
}

function statusBadgeClass(status: Node['status']): string {
  switch (status) {
    case 'healthy':
      return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
    case 'unhealthy':
      return 'bg-red-500/20 text-red-600 dark:text-red-400'
    default:
      return 'bg-muted text-muted-foreground'
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-xl font-semibold">Nodes</h2>
      <div class="flex items-center gap-2">
        <select
          v-model="filterGroupId"
          class="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">All groups</option>
          <option v-for="g in groups ?? []" :key="g.id" :value="g.id">
            {{ g.name }}
          </option>
        </select>
        <UiButton :disabled="!groups || groups.length === 0" @click="openCreateDialog">
          Add Node
        </UiButton>
      </div>
    </div>

    <div v-if="isLoading" class="py-8 text-center text-muted-foreground">
      Loading nodes...
    </div>
    <div
      v-else-if="visibleNodes.length === 0"
      class="py-8 text-center text-muted-foreground"
    >
      No nodes found
    </div>

    <UiCard v-for="node in visibleNodes" :key="node.id" class="p-4">
      <CardContent class="p-0">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1 space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium uppercase"
                :class="statusBadgeClass(node.status)"
              >
                {{ node.status }}
              </span>
              <span class="text-sm font-medium">
                {{ node.country || 'XX' }}
              </span>
              <span class="text-xs text-muted-foreground">
                {{ node.latency_ms }} ms
              </span>
            </div>
            <p class="truncate font-mono text-sm" :title="node.url">
              {{ node.url }}
            </p>
            <p class="text-xs text-muted-foreground">
              Group:
              <span class="font-medium">
                {{ groupNameById[node.group_id] ?? node.group_id }}
              </span>
              · ID: {{ node.id }}
            </p>
          </div>
          <div class="flex gap-2">
            <UiButton variant="outline" size="sm" @click="openEditDialog(node)">
              Edit
            </UiButton>
            <UiButton
              variant="destructive"
              size="sm"
              :disabled="deleteMutation.isPending"
              @click="handleDelete(node)"
            >
              Delete
            </UiButton>
          </div>
        </div>
      </CardContent>
    </UiCard>

    <div
      v-if="showCreateDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <UiCard class="w-full max-w-md p-6">
        <CardHeader>
          <CardTitle>Add Node</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">VLESS URL</label>
            <UiInput
              v-model="nodeUrl"
              placeholder="vless://uuid@host:443?..."
              @keyup.enter="handleCreate"
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">Group</label>
            <select
              v-model="nodeGroupId"
              class="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option v-for="g in groups ?? []" :key="g.id" :value="g.id">
                {{ g.name }}
              </option>
            </select>
          </div>
        </CardContent>
        <CardFooter class="flex justify-end gap-2">
          <UiButton variant="outline" @click="showCreateDialog = false">
            Cancel
          </UiButton>
          <UiButton
            :disabled="!nodeUrl.trim() || !nodeGroupId || createMutation.isPending"
            @click="handleCreate"
          >
            {{ createMutation.isPending ? 'Adding...' : 'Add' }}
          </UiButton>
        </CardFooter>
      </UiCard>
    </div>

    <div
      v-if="showEditDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <UiCard class="w-full max-w-md p-6">
        <CardHeader>
          <CardTitle>Edit Node</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">VLESS URL</label>
            <UiInput v-model="nodeUrl" @keyup.enter="handleUpdate" />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">Group</label>
            <select
              v-model="nodeGroupId"
              class="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option v-for="g in groups ?? []" :key="g.id" :value="g.id">
                {{ g.name }}
              </option>
            </select>
          </div>
        </CardContent>
        <CardFooter class="flex justify-end gap-2">
          <UiButton variant="outline" @click="showEditDialog = false">
            Cancel
          </UiButton>
          <UiButton
            :disabled="!nodeUrl.trim() || !nodeGroupId || updateMutation.isPending"
            @click="handleUpdate"
          >
            {{ updateMutation.isPending ? 'Saving...' : 'Save' }}
          </UiButton>
        </CardFooter>
      </UiCard>
    </div>
  </div>
</template>
