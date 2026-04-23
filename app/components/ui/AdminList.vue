<script setup lang="ts">
import { useAdmins } from "../../features/admins/composables/useAdmins"
import { ref } from "vue"
import { Button } from "~/components/ui/button"
import { Card } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Trash2, Edit } from "lucide-vue-next"
import type { UpdateAdmin } from "../../features/admins/schemas/admin"
import { UpdateAdminSchema } from "../../features/admins/schemas/admin"
import { useForm } from "vee-validate"
import { toTypedSchema } from "@vee-validate/zod"

const { admins, isPending, updateAdmin, isUpdating, deleteAdmin, isDeleting } = useAdmins()

const showEditDialog = ref(false)
const editingAdminId = ref<string | null>(null)

const { handleSubmit, errors: updateErrors, defineField, resetForm } = useForm({
  validationSchema: toTypedSchema(UpdateAdminSchema),
})

const [password, passwordAttrs] = defineField('password')

const openEditDialog = (admin: any) => {
  editingAdminId.value = admin.id
  showEditDialog.value = true
}

const onSubmitEdit = handleSubmit(async (values: UpdateAdmin) => {
  if (editingAdminId.value) {
    await updateAdmin({ id: editingAdminId.value, data: values })
  }
  showEditDialog.value = false
  editingAdminId.value = null
  resetForm()
})
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold">Admins</h1>
    </div>

    <div v-if="isPending" class="text-center py-8">
      Loading admins...
    </div>

    <div v-else-if="!admins || admins.length === 0" class="text-center py-8 text-muted-foreground">
      No admins found
    </div>

    <div v-else class="grid gap-4">
      <Card v-for="admin in admins" :key="admin.id" class="p-4">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <div class="font-semibold">{{ admin.username }}</div>
            <div class="text-sm text-muted-foreground">
              ID: {{ admin.id }}
            </div>
          </div>
          <div class="flex gap-2">
            <Button variant="outline" size="sm" @click="openEditDialog(admin)">
              <Edit class="w-4 h-4" />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              :disabled="isDeleting"
              @click="deleteAdmin(admin.id)"
            >
              <Trash2 class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>

    <div v-if="showEditDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center">
      <Card class="w-full max-w-md p-6">
        <h2 class="text-xl font-bold mb-4">Update Password</h2>
        <form @submit.prevent="onSubmitEdit" class="space-y-4">
          <div>
            <Label for="password">New Password</Label>
            <Input id="password" v-model="password" v-bind="passwordAttrs" type="password" />
            <div v-if="updateErrors.password" class="text-sm text-red-500 mt-1">
              {{ updateErrors.password }}
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
