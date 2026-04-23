<script setup lang="ts">
import { usePublicSources } from "../../features/public-sources/composables/usePublicSources"
import { ref } from "vue"
import { Button } from "~/components/ui/button"
import { Card } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Trash2, Plus, Edit, RefreshCw } from "lucide-vue-next"
import type { CreatePublicSource } from "../../features/public-sources/schemas/public-source"
import { CreatePublicSourceSchema } from "../../features/public-sources/schemas/public-source"
import { useForm } from "vee-validate"
import { toTypedSchema } from "@vee-validate/zod"

const { sources, isPending, createSource, isCreating, deleteSource, isDeleting, updateSource, isUpdating, syncSource, isSyncing } = usePublicSources()

const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const editingSourceId = ref<string | null>(null)

const { handleSubmit, errors: createErrors, defineField, resetForm } = useForm({
  validationSchema: toTypedSchema(CreatePublicSourceSchema),
})

const [url, urlAttrs] = defineField('url')
const [group_id, groupIdAttrs] = defineField('group_id')

const onSubmitCreate = handleSubmit(async (values: CreatePublicSource) => {
  await createSource(values)
  showCreateDialog.value = false
  resetForm()
})

const openEditDialog = (source: any) => {
  editingSourceId.value = source.id
  url.value = source.url
  group_id.value = source.group_id
  showEditDialog.value = true
}

const onSubmitEdit = handleSubmit(async (values: CreatePublicSource) => {
  if (editingSourceId.value) {
    await updateSource({ id: editingSourceId.value, data: values })
  }
  showEditDialog.value = false
  editingSourceId.value = null
  resetForm()
})
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold">Public Sources</h1>
      <Button @click="showCreateDialog = true">
        <Plus class="w-4 h-4 mr-2" />
        Add Source
      </Button>
    </div>

    <div v-if="isPending" class="text-center py-8">
      Loading sources...
    </div>

    <div v-else-if="!sources || sources.length === 0" class="text-center py-8 text-muted-foreground">
      No public sources found
    </div>

    <div v-else class="grid gap-4">
      <Card v-for="source in sources" :key="source.id" class="p-4">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <div class="font-semibold truncate">{{ source.url }}</div>
            <div class="text-sm text-muted-foreground">
              Group: {{ source.group_id }}
            </div>
            <div class="text-sm text-muted-foreground">
              Last fetched: {{ source.last_fetched_at ? new Date(source.last_fetched_at).toLocaleString() : 'Never' }}
            </div>
            <div class="text-sm text-muted-foreground">
              Created: {{ new Date(source.created_at).toLocaleString() }}
            </div>
          </div>
          <div class="flex gap-2">
            <Button variant="outline" size="sm" :disabled="isSyncing" @click="syncSource(source.id)">
              <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isSyncing }" />
            </Button>
            <Button variant="outline" size="sm" @click="openEditDialog(source)">
              <Edit class="w-4 h-4" />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              :disabled="isDeleting"
              @click="deleteSource(source.id)"
            >
              <Trash2 class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>

    <div v-if="showCreateDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center">
      <Card class="w-full max-w-md p-6">
        <h2 class="text-xl font-bold mb-4">Add Public Source</h2>
        <form @submit.prevent="onSubmitCreate" class="space-y-4">
          <div>
            <Label for="url">URL</Label>
            <Input id="url" v-model="url" v-bind="urlAttrs" placeholder="https://..." />
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

    <div v-if="showEditDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center">
      <Card class="w-full max-w-md p-6">
        <h2 class="text-xl font-bold mb-4">Edit Public Source</h2>
        <form @submit.prevent="onSubmitEdit" class="space-y-4">
          <div>
            <Label for="edit-url">URL</Label>
            <Input id="edit-url" v-model="url" v-bind="urlAttrs" placeholder="https://..." />
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
