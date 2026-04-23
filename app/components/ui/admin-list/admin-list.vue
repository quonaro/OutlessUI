<script setup lang="ts">
import { ref } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type { Admin } from '~/utils/schemas/admin'
import { fetchAdmins, updateAdminPassword, deleteAdmin } from '~/utils/services/admin'
import UiButton from '~/components/ui/button/button.vue'
import UiInput from '~/components/ui/input/input.vue'
import UiCard from '~/components/ui/card/card.vue'
import CardHeader from '~/components/ui/card/CardHeader.vue'
import CardTitle from '~/components/ui/card/CardTitle.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import CardFooter from '~/components/ui/card/CardFooter.vue'

const config = useRuntimeConfig()
const baseURL = config.public.apiBase as string
const queryClient = useQueryClient()

const { data: admins, isLoading } = useQuery({
  queryKey: ['admins'],
  queryFn: () => fetchAdmins(baseURL),
})

const showPasswordDialog = ref(false)
const selectedAdmin = ref<Admin | null>(null)
const newPassword = ref('')

const updateMutation = useMutation({
  mutationFn: ({ id, password }: { id: string; password: { password: string } }) =>
    updateAdminPassword(id, password, baseURL),
  onSuccess: () => {
    showPasswordDialog.value = false
    newPassword.value = ''
    selectedAdmin.value = null
    queryClient.invalidateQueries({ queryKey: ['admins'] })
  },
})

const deleteMutation = useMutation({
  mutationFn: (id: string) => deleteAdmin(id, baseURL),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['admins'] })
  },
})

async function handleUpdatePassword() {
  if (!selectedAdmin.value || !newPassword.value) return
  updateMutation.mutate({
    id: selectedAdmin.value.id,
    password: { password: newPassword.value },
  })
}

async function handleDeleteAdmin(admin: Admin) {
  if (!confirm(`Are you sure you want to delete admin "${admin.username}"?`)) return
  deleteMutation.mutate(admin.id)
}

function openPasswordDialog(admin: Admin) {
  selectedAdmin.value = admin
  newPassword.value = ''
  showPasswordDialog.value = true
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="isLoading" class="text-center text-muted-foreground py-8">
      Loading admins...
    </div>
    <div v-else-if="!admins || admins.length === 0" class="text-center text-muted-foreground py-8">
      No admins found
    </div>
    
    <UiCard v-for="admin in admins" :key="admin.id" class="p-4">
      <CardContent class="p-0">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-lg">{{ admin.username }}</h3>
            <p class="text-muted-foreground text-sm mt-1">
              ID: {{ admin.id }}
            </p>
          </div>
          <div class="flex gap-2">
            <UiButton
              variant="outline"
              size="sm"
              @click="openPasswordDialog(admin)"
            >
              Update Password
            </UiButton>
            <UiButton
              variant="destructive"
              size="sm"
              :disabled="deleteMutation.isPending"
              @click="handleDeleteAdmin(admin)"
            >
              Delete
            </UiButton>
          </div>
        </div>
      </CardContent>
    </UiCard>

    <!-- Password Update Dialog -->
    <div v-if="showPasswordDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <UiCard class="w-full max-w-md p-6">
        <CardHeader>
          <CardTitle>Update Password</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <p class="text-sm text-muted-foreground">
            Update password for admin "{{ selectedAdmin?.username }}"
          </p>
          <div class="space-y-2">
            <label class="text-sm font-medium">New Password</label>
            <UiInput
              v-model="newPassword"
              type="password"
              placeholder="Enter new password (min 8 characters)"
              @keyup.enter="handleUpdatePassword"
            />
          </div>
        </CardContent>
        <CardFooter class="flex justify-end gap-2">
          <UiButton variant="outline" @click="showPasswordDialog = false">
            Cancel
          </UiButton>
          <UiButton
            :disabled="!newPassword || newPassword.length < 8 || updateMutation.isPending"
            @click="handleUpdatePassword"
          >
            {{ updateMutation.isPending ? 'Updating...' : 'Update' }}
          </UiButton>
        </CardFooter>
      </UiCard>
    </div>
  </div>
</template>
