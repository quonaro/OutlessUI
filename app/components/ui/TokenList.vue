<script setup lang="ts">
import { useTokens } from "../../features/tokens/composables/useTokens"
import { ref } from "vue"
import { Button } from "~/components/ui/button"
import { Card } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Trash2, Plus, Copy, Check } from "lucide-vue-next"
import type { CreateToken } from "../../features/tokens/schemas/token"
import { CreateTokenSchema } from "../../features/tokens/schemas/token"
import { useForm } from "vee-validate"
import { toTypedSchema } from "@vee-validate/zod"

const { tokens, isPending, createToken, isCreating, deleteToken, isDeleting } = useTokens()

const showCreateDialog = ref(false)
const copiedTokenId = ref<string | null>(null)

const { handleSubmit, errors: createErrors, defineField, resetForm } = useForm({
  validationSchema: toTypedSchema(CreateTokenSchema),
})

const [owner, ownerAttrs] = defineField('owner')
const [group_id, groupIdAttrs] = defineField('group_id')
const [expires_in, expiresInAttrs] = defineField('expires_in')

const onSubmitCreate = handleSubmit(async (values: CreateToken) => {
  await createToken(values)
  showCreateDialog.value = false
  resetForm()
})

const copyToClipboard = (token: string, id: string) => {
  navigator.clipboard.writeText(token)
  copiedTokenId.value = id
  setTimeout(() => {
    copiedTokenId.value = null
  }, 2000)
}
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold">Tokens</h1>
      <Button @click="showCreateDialog = true">
        <Plus class="w-4 h-4 mr-2" />
        Create Token
      </Button>
    </div>

    <div v-if="isPending" class="text-center py-8">
      Loading tokens...
    </div>

    <div v-else-if="!tokens || tokens.length === 0" class="text-center py-8 text-muted-foreground">
      No tokens found
    </div>

    <div v-else class="grid gap-4">
      <Card v-for="token in tokens" :key="token.id" class="p-4">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <div class="font-semibold">{{ token.owner }}</div>
            <div class="text-sm text-muted-foreground">
              Group: {{ token.group_id }}
            </div>
            <div class="text-sm text-muted-foreground">
              Expires: {{ new Date(token.expires_at).toLocaleString() }}
            </div>
            <div class="text-sm" :class="token.is_active ? 'text-green-600' : 'text-red-600'">
              {{ token.is_active ? 'Active' : 'Inactive' }}
            </div>
          </div>
          <div class="flex gap-2">
            <Button
              v-if="token.token"
              variant="outline"
              size="sm"
              @click="copyToClipboard(token.token, token.id)"
            >
              <Check v-if="copiedTokenId === token.id" class="w-4 h-4" />
              <Copy v-else class="w-4 h-4" />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              :disabled="isDeleting"
              @click="deleteToken(token.id)"
            >
              <Trash2 class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>

    <div v-if="showCreateDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center">
      <Card class="w-full max-w-md p-6">
        <h2 class="text-xl font-bold mb-4">Create Token</h2>
        <form @submit.prevent="onSubmitCreate" class="space-y-4">
          <div>
            <Label for="owner">Owner</Label>
            <Input id="owner" v-model="owner" v-bind="ownerAttrs" placeholder="Token owner" />
            <div v-if="createErrors.owner" class="text-sm text-red-500 mt-1">
              {{ createErrors.owner }}
            </div>
          </div>
          <div>
            <Label for="group_id">Group ID</Label>
            <Input id="group_id" v-model="group_id" v-bind="groupIdAttrs" placeholder="Group ID" />
            <div v-if="createErrors.group_id" class="text-sm text-red-500 mt-1">
              {{ createErrors.group_id }}
            </div>
          </div>
          <div>
            <Label for="expires_in">Expires In</Label>
            <Input id="expires_in" v-model="expires_in" v-bind="expiresInAttrs" placeholder="30d" />
            <div v-if="createErrors.expires_in" class="text-sm text-red-500 mt-1">
              {{ createErrors.expires_in }}
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
  </div>
</template>
