<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import type { CreateToken, IssuedToken, Token } from '~/utils/schemas/token'
import { EXPIRES_IN_OPTIONS } from '~/utils/schemas/token'
import { useTokens } from '~/composables/tokens/useTokens'
import { useCreateToken } from '~/composables/tokens/useCreateToken'
import { useDeleteToken } from '~/composables/tokens/useDeleteToken'
import { useRemoveToken } from '~/composables/tokens/useRemoveToken'
import { useGroups } from '~/composables/groups/useGroups'
import UiButton from '~/components/ui/button/button.vue'
import UiInput from '~/components/ui/input/input.vue'
import UiCard from '~/components/ui/card/card.vue'
import CardHeader from '~/components/ui/card/CardHeader.vue'
import CardTitle from '~/components/ui/card/CardTitle.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import CardFooter from '~/components/ui/card/CardFooter.vue'

const config = useRuntimeConfig()
const apiBase = (config.public.apiBase as string).replace(/\/+$/, '')
const queryClient = useQueryClient()

const { data: tokens, isLoading } = useTokens()
const { data: groups } = useGroups()

const showCreateDialog = ref(false)
const showIssuedDialog = ref(false)
const showAccessURLDialog = ref(false)
const issuedToken = ref<IssuedToken | null>(null)
const selectedAccessURL = ref('')
const issuedAccessURL = ref('')
const isIssueSubmitting = ref(false)
const pendingDeactivateId = ref('')
const pendingRemoveId = ref('')

const ownerInput = ref('')
const groupIdsInput = ref<string[]>([])
const expiresInInput = ref(EXPIRES_IN_OPTIONS[2].value)

const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tokens'] })

const createMutation = useCreateToken({
  onSuccess: (token) => {
    issuedToken.value = token
    issuedAccessURL.value = resolveAccessURL(token)
    showIssuedDialog.value = true
    showCreateDialog.value = false
    resetForm()
    invalidate()
  },
})

const deleteMutation = useDeleteToken({
  onSuccess: invalidate,
})
const removeMutation = useRemoveToken({
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
  groupIdsInput.value = []
  expiresInInput.value = EXPIRES_IN_OPTIONS[2].value
  isIssueSubmitting.value = false
}

function openCreateDialog() {
  createMutation.reset()
  resetForm()
  showCreateDialog.value = true
}

function closeCreateDialog() {
  createMutation.reset()
  showCreateDialog.value = false
  resetForm()
}

function closeIssuedDialog() {
  showIssuedDialog.value = false
  issuedToken.value = null
  issuedAccessURL.value = ''
}

function handleCreate() {
  if (!ownerInput.value.trim() || !expiresInInput.value || isIssueSubmitting.value) return
  const payload: CreateToken = {
    owner: ownerInput.value.trim(),
    group_ids: groupIdsInput.value,
    expires_in: expiresInInput.value,
  }
  isIssueSubmitting.value = true
  createMutation.mutate(payload, {
    onSettled: () => {
      isIssueSubmitting.value = false
    },
  })
}

function handleDeactivate(token: Token) {
  if (!confirm(`Deactivate token for ${token.owner}?`)) return
  pendingDeactivateId.value = token.id
  deleteMutation.mutate(token.id, {
    onSettled: () => {
      pendingDeactivateId.value = ''
    },
  })
}

function handleRemove(token: Token) {
  if (!confirm(`Remove token for ${token.owner}? This action cannot be undone.`)) return
  pendingRemoveId.value = token.id
  removeMutation.mutate(token.id, {
    onSettled: () => {
      pendingRemoveId.value = ''
    },
  })
}

function resolveAccessURL(token: Pick<Token, 'access_url'>): string {
  if (!token.access_url) return ''
  if (token.access_url.startsWith('http://') || token.access_url.startsWith('https://')) {
    return token.access_url
  }
  const path = token.access_url.startsWith('/') ? token.access_url : `/${token.access_url}`
  return `${apiBase}${path}`
}

async function copyText(value: string) {
  if (!value) return
  try {
    await navigator.clipboard?.writeText(value)
  } catch {
    // clipboard may be unavailable outside secure context
  }
}

function viewAccessURL(token: Token) {
  selectedAccessURL.value = resolveAccessURL(token)
  if (!selectedAccessURL.value) {
    alert('Access URL is unavailable for this legacy token. Re-issue token to recover URL.')
    return
  }
  showAccessURLDialog.value = true
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

function tokenGroupLabels(token: Token): string {
  const groupIDs = token.group_ids?.length ? token.group_ids : (token.group_id ? [token.group_id] : [])
  if (groupIDs.length === 0) return 'All groups'
  return groupIDs.map((id) => groupNameById.value[id] ?? id).join(', ')
}

function toggleGroupSelection(groupID: string, checked: boolean) {
  if (checked) {
    groupIdsInput.value = [...groupIdsInput.value.filter((id) => id !== groupID), groupID]
    return
  }
  groupIdsInput.value = groupIdsInput.value.filter((id) => id !== groupID)
}

function handleGroupCheckboxChange(groupID: string, event: Event) {
  const target = event.target as HTMLInputElement | null
  if (!target) return
  toggleGroupSelection(groupID, target.checked)
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-end gap-3">
      <UiButton @click="openCreateDialog">
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

    <UiCard v-for="token in sortedTokens" :key="token.id" class="px-3 py-2">
      <CardContent class="p-0">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1 space-y-0.5">
            <div class="flex flex-wrap items-center gap-1.5">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium uppercase"
                :class="statusBadge(token).cls"
              >
                {{ statusBadge(token).label }}
              </span>
              <span class="truncate text-sm font-semibold">{{ token.owner }}</span>
            </div>
            <p class="text-xs text-muted-foreground">
              Groups: <span class="font-medium">{{ tokenGroupLabels(token) }}</span>
            </p>
            <p class="text-xs text-muted-foreground">
              Expires: {{ new Date(token.expires_at).toLocaleString() }} · Created: {{ new Date(token.created_at).toLocaleString() }}
            </p>
          </div>
          <div class="flex shrink-0 gap-1">
            <UiButton
              variant="outline"
              size="sm"
              @click="viewAccessURL(token)"
            >
              View URL
            </UiButton>
            <UiButton
              v-if="token.is_active"
              variant="destructive"
              size="sm"
              :disabled="pendingDeactivateId === token.id"
              @click="handleDeactivate(token)"
            >
              Deactivate
            </UiButton>
            <UiButton
              v-else
              variant="destructive"
              size="sm"
              :disabled="pendingRemoveId === token.id"
              @click="handleRemove(token)"
            >
              Remove
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
            <label class="text-sm font-medium">Group Access</label>
            <div class="max-h-40 space-y-2 overflow-auto rounded-md border p-2">
              <label class="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  :checked="groupIdsInput.length === 0"
                  @change="groupIdsInput = []"
                >
                <span>All groups</span>
              </label>
              <label
                v-for="g in groups ?? []"
                :key="g.id"
                class="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  :checked="groupIdsInput.includes(g.id)"
                  @change="handleGroupCheckboxChange(g.id, $event)"
                >
                <span>{{ g.name }}</span>
              </label>
            </div>
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
          <UiButton variant="outline" @click="closeCreateDialog">
            Cancel
          </UiButton>
          <UiButton
            :disabled="!ownerInput.trim() || isIssueSubmitting"
            @click="handleCreate"
          >
            {{ isIssueSubmitting ? 'Issuing...' : 'Issue' }}
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
            Copy and share this subscription URL. Users can import it directly in VLESS clients.
          </p>
          <pre
            class="max-h-40 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs"
          >{{ issuedAccessURL }}</pre>
        </CardContent>
        <CardFooter class="flex justify-end gap-2">
          <UiButton variant="outline" @click="copyText(issuedAccessURL)">Copy URL</UiButton>
          <UiButton @click="closeIssuedDialog">Close</UiButton>
        </CardFooter>
      </UiCard>
    </div>

    <div
      v-if="showAccessURLDialog && selectedAccessURL"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <UiCard class="w-full max-w-xl p-6">
        <CardHeader>
          <CardTitle>Access URL</CardTitle>
        </CardHeader>
        <CardContent>
          <pre class="overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs">{{ selectedAccessURL }}</pre>
        </CardContent>
        <CardFooter class="flex justify-end gap-2">
          <UiButton variant="outline" @click="copyText(selectedAccessURL)">Copy</UiButton>
          <UiButton @click="showAccessURLDialog = false">Close</UiButton>
        </CardFooter>
      </UiCard>
    </div>
  </div>
</template>
