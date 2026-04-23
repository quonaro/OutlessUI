<script setup lang="ts">
import { useNodes } from "../../features/nodes/composables/useNodes"
import { ref } from "vue"
import { Button } from "~/components/ui/button"
import { Card } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Trash2, Plus, Edit } from "lucide-vue-next"
import type { CreateNode } from "../../features/nodes/schemas/node"
import { CreateNodeSchema } from "../../features/nodes/schemas/node"
import { useForm } from "vee-validate"
import { toTypedSchema } from "@vee-validate/zod"

const { nodes, isPending, createNode, isCreating, deleteNode, isDeleting, updateNode, isUpdating } = useNodes()

const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const editingNodeId = ref<string | null>(null)

const { handleSubmit, errors: createErrors, defineField, resetForm } = useForm({
  validationSchema: toTypedSchema(CreateNodeSchema),
})

const [url, urlAttrs] = defineField('url')
const [group_id, groupIdAttrs] = defineField('group_id')

const onSubmitCreate = handleSubmit(async (values: CreateNode) => {
  await createNode(values)
  showCreateDialog.value = false
  resetForm()
})

const openEditDialog = (node: any) => {
  editingNodeId.value = node.id
  url.value = node.url
  group_id.value = node.group_id
  showEditDialog.value = true
}

const onSubmitEdit = handleSubmit(async (values: CreateNode) => {
  if (editingNodeId.value) {
    await updateNode({ id: editingNodeId.value, data: values })
  }
  showEditDialog.value = false
  editingNodeId.value = null
  resetForm()
})
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold">Nodes</h1>
      <Button @click="showCreateDialog = true">
        <Plus class="w-4 h-4 mr-2" />
        Add Node
      </Button>
    </div>

    <div v-if="isPending" class="text-center py-8">
      Loading nodes...
    </div>

    <div v-else-if="!nodes || nodes.length === 0" class="text-center py-8 text-muted-foreground">
      No nodes found
    </div>

    <div v-else class="grid gap-4">
      <Card v-for="node in nodes" :key="node.id" class="p-4">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <div class="font-semibold truncate">{{ node.url }}</div>
            <div class="text-sm text-muted-foreground">
              Group: {{ node.group_id }}
            </div>
            <div class="text-sm text-muted-foreground">
              Latency: {{ node.latency_ms }}ms
            </div>
            <div class="text-sm" :class="{
              'text-green-600': node.status === 'healthy',
              'text-red-600': node.status === 'unhealthy',
              'text-gray-600': node.status === 'unknown'
            }">
              Status: {{ node.status }}
            </div>
            <div class="text-sm text-muted-foreground">
              Country: {{ node.country || 'N/A' }}
            </div>
          </div>
          <div class="flex gap-2">
            <Button variant="outline" size="sm" @click="openEditDialog(node)">
              <Edit class="w-4 h-4" />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              :disabled="isDeleting"
              @click="deleteNode(node.id)"
            >
              <Trash2 class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>

    <!-- Create Dialog -->
    <div v-if="showCreateDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center">
      <Card class="w-full max-w-md p-6">
        <h2 class="text-xl font-bold mb-4">Add Node</h2>
        <form @submit.prevent="onSubmitCreate" class="space-y-4">
          <div>
            <Label for="url">URL</Label>
            <Input id="url" v-model="url" v-bind="urlAttrs" placeholder="vless://..." />
            <div v-if="createErrors.url" class="text-sm text-red-500 mt-1">
              {{ createErrors.url }}
            </div>
          </div>
          <div>
            <Label for="group_id">Group ID</Label>
            <Input id="group_id" v-model="group_id" v-bind="groupIdAttrs" placeholder="Group ID" />
            <div v-if="createErrors.group_id" class="text-sm text-red-500 mt-1">
              {{ createErrors.group_id }}
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <Button type="button" variant="outline" @click="showCreateDialog = false">
              Cancel
            </Button>
            <Button type="submit" :disabled="isCreating">
              {{ isCreating ? "Creating..." : "Create" }}
            </Button>
          </div>
        </form>
      </Card>
    </div>

    <!-- Edit Dialog -->
    <div v-if="showEditDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center">
      <Card class="w-full max-w-md p-6">
        <h2 class="text-xl font-bold mb-4">Edit Node</h2>
        <form @submit.prevent="onSubmitEdit" class="space-y-4">
          <div>
            <Label for="edit-url">URL</Label>
            <Input id="edit-url" v-model="url" v-bind="urlAttrs" placeholder="vless://..." />
            <div v-if="createErrors.url" class="text-sm text-red-500 mt-1">
              {{ createErrors.url }}
            </div>
          </div>
          <div>
            <Label for="edit-group_id">Group ID</Label>
            <Input id="edit-group_id" v-model="group_id" v-bind="groupIdAttrs" placeholder="Group ID" />
            <div v-if="createErrors.group_id" class="text-sm text-red-500 mt-1">
              {{ createErrors.group_id }}
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <Button type="button" variant="outline" @click="showEditDialog = false">
              Cancel
            </Button>
            <Button type="submit" :disabled="isUpdating">
              {{ isUpdating ? "Updating..." : "Update" }}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  </div>
</template>
