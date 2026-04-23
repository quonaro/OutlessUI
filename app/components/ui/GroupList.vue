<script setup lang="ts">
import { useGroups } from "../../features/groups/composables/useGroups"
import { ref } from "vue"
import { Button } from "~/components/ui/button"
import { Card } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Trash2, Plus, Edit } from "lucide-vue-next"
import type { CreateGroup } from "../../features/groups/schemas/group"
import { CreateGroupSchema } from "../../features/groups/schemas/group"
import { useForm } from "vee-validate"
import { toTypedSchema } from "@vee-validate/zod"

const { groups, isPending, createGroup, isCreating, deleteGroup, isDeleting, updateGroup, isUpdating } = useGroups()

const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const editingGroupId = ref<string | null>(null)

const { handleSubmit, errors: createErrors, defineField, resetForm } = useForm({
  validationSchema: toTypedSchema(CreateGroupSchema),
})

const [name, nameAttrs] = defineField('name')

const onSubmitCreate = handleSubmit(async (values: CreateGroup) => {
  await createGroup(values)
  showCreateDialog.value = false
  resetForm()
})

const openEditDialog = (group: any) => {
  editingGroupId.value = group.id
  name.value = group.name
  showEditDialog.value = true
}

const onSubmitEdit = handleSubmit(async (values: CreateGroup) => {
  if (editingGroupId.value) {
    await updateGroup({ id: editingGroupId.value, data: values })
  }
  showEditDialog.value = false
  editingGroupId.value = null
  resetForm()
})
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold">Groups</h1>
      <Button @click="showCreateDialog = true">
        <Plus class="w-4 h-4 mr-2" />
        Add Group
      </Button>
    </div>

    <div v-if="isPending" class="text-center py-8">
      Loading groups...
    </div>

    <div v-else-if="!groups || groups.length === 0" class="text-center py-8 text-muted-foreground">
      No groups found
    </div>

    <div v-else class="grid gap-4">
      <Card v-for="group in groups" :key="group.id" class="p-4">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <div class="font-semibold">{{ group.name }}</div>
            <div class="text-sm text-muted-foreground">
              ID: {{ group.id }}
            </div>
            <div class="text-sm text-muted-foreground">
              Created: {{ new Date(group.created_at).toLocaleString() }}
            </div>
          </div>
          <div class="flex gap-2">
            <Button variant="outline" size="sm" @click="openEditDialog(group)">
              <Edit class="w-4 h-4" />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              :disabled="isDeleting"
              @click="deleteGroup(group.id)"
            >
              <Trash2 class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>

    <div v-if="showCreateDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center">
      <Card class="w-full max-w-md p-6">
        <h2 class="text-xl font-bold mb-4">Add Group</h2>
        <form @submit.prevent="onSubmitCreate" class="space-y-4">
          <div>
            <Label for="name">Name</Label>
            <Input id="name" v-model="name" v-bind="nameAttrs" placeholder="Group name" />
            <div v-if="createErrors.name" class="text-sm text-red-500 mt-1">
              {{ createErrors.name }}
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
        <h2 class="text-xl font-bold mb-4">Edit Group</h2>
        <form @submit.prevent="onSubmitEdit" class="space-y-4">
          <div>
            <Label for="edit-name">Name</Label>
            <Input id="edit-name" v-model="name" v-bind="nameAttrs" placeholder="Group name" />
            <div v-if="createErrors.name" class="text-sm text-red-500 mt-1">
              {{ createErrors.name }}
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
