<script setup lang="ts">
import { ref } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type { Group, CreateGroup, UpdateGroup } from '~/utils/schemas/group'
import { fetchGroups, createGroup, updateGroup, deleteGroup } from '~/utils/services/group'
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

const { data: groups, isLoading } = useQuery({
  queryKey: ['groups'],
  queryFn: () => fetchGroups(baseURL),
})

const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const selectedGroup = ref<Group | null>(null)
const groupName = ref('')

const createMutation = useMutation({
  mutationFn: (data: CreateGroup) => createGroup(data, baseURL),
  onSuccess: () => {
    showCreateDialog.value = false
    groupName.value = ''
    queryClient.invalidateQueries({ queryKey: ['groups'] })
  },
})

const updateMutation = useMutation({
  mutationFn: ({ id, data }: { id: string; data: UpdateGroup }) =>
    updateGroup(id, data, baseURL),
  onSuccess: () => {
    showEditDialog.value = false
    groupName.value = ''
    selectedGroup.value = null
    queryClient.invalidateQueries({ queryKey: ['groups'] })
  },
})

const deleteMutation = useMutation({
  mutationFn: (id: string) => deleteGroup(id, baseURL),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['groups'] })
  },
})

function handleCreateGroup() {
  if (!groupName.value.trim()) return
  createMutation.mutate({ name: groupName.value })
}

function handleEditGroup() {
  if (!selectedGroup.value || !groupName.value.trim()) return
  updateMutation.mutate({
    id: selectedGroup.value.id,
    data: { name: groupName.value },
  })
}

function handleDeleteGroup(group: Group) {
  if (!confirm(`Are you sure you want to delete group "${group.name}"?`)) return
  deleteMutation.mutate(group.id)
}

function openEditDialog(group: Group) {
  selectedGroup.value = group
  groupName.value = group.name
  showEditDialog.value = true
}

function openCreateDialog() {
  groupName.value = ''
  showCreateDialog.value = true
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold">Groups</h2>
      <UiButton @click="openCreateDialog">
        Create Group
      </UiButton>
    </div>

    <div v-if="isLoading" class="text-center text-muted-foreground py-8">
      Loading groups...
    </div>
    <div v-else-if="!groups || groups.length === 0" class="text-center text-muted-foreground py-8">
      No groups found
    </div>
    
    <UiCard v-for="group in groups" :key="group.id" class="p-4">
      <CardContent class="p-0">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-lg">{{ group.name }}</h3>
            <p class="text-muted-foreground text-sm mt-1">
              ID: {{ group.id }}
            </p>
            <p class="text-muted-foreground text-sm">
              Created: {{ new Date(group.created_at).toLocaleString() }}
            </p>
          </div>
          <div class="flex gap-2">
            <UiButton
              variant="outline"
              size="sm"
              @click="openEditDialog(group)"
            >
              Edit
            </UiButton>
            <UiButton
              variant="destructive"
              size="sm"
              :disabled="deleteMutation.isPending"
              @click="handleDeleteGroup(group)"
            >
              Delete
            </UiButton>
          </div>
        </div>
      </CardContent>
    </UiCard>

    <!-- Create Group Dialog -->
    <div v-if="showCreateDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <UiCard class="w-full max-w-md p-6">
        <CardHeader>
          <CardTitle>Create Group</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">Group Name</label>
            <UiInput
              v-model="groupName"
              placeholder="Enter group name"
              @keyup.enter="handleCreateGroup"
            />
          </div>
        </CardContent>
        <CardFooter class="flex justify-end gap-2">
          <UiButton variant="outline" @click="showCreateDialog = false">
            Cancel
          </UiButton>
          <UiButton
            :disabled="!groupName.trim() || createMutation.isPending"
            @click="handleCreateGroup"
          >
            {{ createMutation.isPending ? 'Creating...' : 'Create' }}
          </UiButton>
        </CardFooter>
      </UiCard>
    </div>

    <!-- Edit Group Dialog -->
    <div v-if="showEditDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <UiCard class="w-full max-w-md p-6">
        <CardHeader>
          <CardTitle>Edit Group</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">Group Name</label>
            <UiInput
              v-model="groupName"
              placeholder="Enter group name"
              @keyup.enter="handleEditGroup"
            />
          </div>
        </CardContent>
        <CardFooter class="flex justify-end gap-2">
          <UiButton variant="outline" @click="showEditDialog = false">
            Cancel
          </UiButton>
          <UiButton
            :disabled="!groupName.trim() || updateMutation.isPending"
            @click="handleEditGroup"
          >
            {{ updateMutation.isPending ? 'Updating...' : 'Update' }}
          </UiButton>
        </CardFooter>
      </UiCard>
    </div>
  </div>
</template>
