<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import type { CreateToken, IssuedToken, Token } from '~/utils/schemas/token'
import { EXPIRES_IN_OPTIONS } from '~/utils/schemas/token'
import { useTokens } from '~/composables/tokens/useTokens'
import { useCreateToken } from '~/composables/tokens/useCreateToken'
import { useDeleteToken } from '~/composables/tokens/useDeleteToken'
import { useGroups } from '~/composables/groups/useGroups'
import UiButton from '~/components/ui/button/button.vue'
import UiInput from '~/components/ui/input/input.vue'
import UiCard from '~/components/ui/card/card.vue'
import CardHeader from '~/components/ui/card/CardHeader.vue'
import CardTitle from '~/components/ui/card/CardTitle.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import CardFooter from '~/components/ui/card/CardFooter.vue'

const queryClient = useQueryClient()

const { data: tokens, isLoading } = useTokens()
const { data: groups } = useGroups()

const showCreateDialog = ref(false)
const showIssuedDialog = ref(false)
const issuedToken = ref<IssuedToken | null>(null)

const ownerInput = ref('')
const groupIdInput = ref('')
const expiresInInput = ref(EXPIRES_IN_OPTIONS[2].value)

const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tokens'] })

const createMutation = useCreateToken({
  onSuccess: (token) => {
    issuedToken.value = token
    showIssuedDialog.value = true
    showCreateDialog.value = false
    resetForm()
    invalidate()
  },
})

const deleteMutation = useDeleteToken({
  onSuccess: invalidate,
})

const groupNameById = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const group of groups.value ?? []) {
    map[group.id] = group.name
  }
  return map
})

const sortedTokens = computed<Token[]>(() => {
  const list = tokens.value ?? []
  return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at))
})

function resetForm() {
  ownerInput.value = ''
  if (groups.value && groups.value.length > 0) {
    groupIdInput.value = groups.value[0].id
  } else {
    groupIdInput.value = ''
  }
  expiresInInput.value = EXPIRES_IN_OPTIONS[2].value
}

function openCreateDialog() {
  resetForm()
  showCreateDialog.value = true
}

function handleCreate() {
  if (!ownerInput.value.trim() || !groupIdInput.value || !expiresInInput.value) return
  const payload: CreateToken = {
    owner: ownerInput.value.trim(),
    group_id: groupIdInput.value,
    expires_in: expiresInInput.value,
  }
  createMutation.mutate(payload)
}

function handleDeactivate(token: Token) {
  if (!confirm(`Deactivate token for ${token.owner}?`)) return
  deleteMutation.mutate(token.id)
}

function copyToken() {
  if (!issuedToken.value) return
  navigator.clipboard?.writeText(issuedToken.value.token).catch(() => {
    // clipboard may be unavailable outside https contexts; ignore
  })
}

function statusBadge(token: Token): { label: string; cls: string } {
  if (!token.is_active) {
    return { label: 'inactive', cls: 'bg-muted text-muted-foreground' }
  }
  const expired = new Date(token.expires_at).getTime() <= Date.now()
  if (expired) {
    return { label: 'expired', cls: 'bg-red-500/20 text-red-600 dark:text-red-400' }
  }
  return { label: 'active', cls: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-xl font-semibold">Tokens</h2>
      <UiButton :disabled="!groups || groups.length === 0" @click="openCreateDialog">
        Issue Token
      </UiButton>
    </div>

    <div v-if="isLoading" class="py-8 text-center text-muted-foreground">
      Loading tokens...
    </div>
    <div
      v-else-if="sortedTokens.length === 0"
      class="py-8 text-center text-muted-foreground"
    >
      No tokens issued yet
    </div>

    <UiCard v-for="token in sortedTokens" :key="token.id" class="p-4">
      <CardContent class="p-0">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1 space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium uppercase"
                :class="statusBadge(token).cls"
              >
                {{ statusBadge(token).label }}
              </span>
              <span class="font-semibold">{{ token.owner }}</span>
            </div>
            <p class="text-xs text-muted-foreground">
              Group:
              <span class="font-medium">
                {{ groupNameById[token.group_id] ?? token.group_id }}
              </span>
            </p>
            <p class="text-xs text-muted-foreground">
              Expires: {{ new Date(token.expires_at).toLocaleString() }}
            </p>
            <p class="text-xs text-muted-foreground">
              Created: {{ new Date(token.created_at).toLocaleString() }}
            </p>
          </div>
          <div class="flex gap-2">
            <UiButton
              variant="destructive"
              size="sm"
              :disabled="!token.is_active || deleteMutation.isPending"
              @click="handleDeactivate(token)"
            >
              Deactivate
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
          <CardTitle>Issue Token</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">Owner</label>
            <UiInput
              v-model="ownerInput"
              placeholder="user@example.com"
              @keyup.enter="handleCreate"
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">Group</label>
            <select
              v-model="groupIdInput"
              class="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option v-for="g in groups ?? []" :key="g.id" :value="g.id">
                {{ g.name }}
              </option>
            </select>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">Expires in</label>
            <select
              v-model="expiresInInput"
              class="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option
                v-for="opt in EXPIRES_IN_OPTIONS"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>
        </CardContent>
        <CardFooter class="flex justify-end gap-2">
          <UiButton variant="outline" @click="showCreateDialog = false">
            Cancel
          </UiButton>
          <UiButton
            :disabled="!ownerInput.trim() || !groupIdInput || createMutation.isPending"
            @click="handleCreate"
          >
            {{ createMutation.isPending ? 'Issuing...' : 'Issue' }}
          </UiButton>
        </CardFooter>
      </UiCard>
    </div>

    <div
      v-if="showIssuedDialog && issuedToken"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <UiCard class="w-full max-w-lg p-6">
        <CardHeader>
          <CardTitle>Token Issued</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <p class="text-sm text-muted-foreground">
            Copy the token below. It will never be shown again.
          </p>
          <pre
            class="max-h-40 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs"
          >{{ issuedToken.token }}</pre>
        </CardContent>
        <CardFooter class="flex justify-end gap-2">
          <UiButton variant="outline" @click="copyToken">Copy</UiButton>
          <UiButton @click="showIssuedDialog = false">Close</UiButton>
        </CardFooter>
      </UiCard>
    </div>
  </div>
</template>
