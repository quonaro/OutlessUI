<script setup lang="ts">
import { ref } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type { Settings, UpdateSettings } from '~/utils/schemas/settings'
import { fetchSettings, updateSettings } from '~/utils/services/settings'
import UiButton from '~/components/ui/button/button.vue'
import UiInput from '~/components/ui/input/input.vue'
import UiCard from '~/components/ui/card/card.vue'
import CardHeader from '~/components/ui/card/CardHeader.vue'
import CardTitle from '~/components/ui/card/CardTitle.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import CardFooter from '~/components/ui/card/CardFooter.vue'
import ChangePasswordDialog from '~/components/ui/change-password-dialog/change-password-dialog.vue'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion'

const config = useRuntimeConfig()
const baseURL = config.public.apiBase as string
const queryClient = useQueryClient()

const { data: settings, isLoading } = useQuery({
  queryKey: ['settings'],
  queryFn: () => fetchSettings(baseURL),
  retry: false,
})

// Edit states for each section
const editingStates = ref({
  database: false,
  api: false,
  checker: false,
})

// Password dialog state
const passwordDialogOpen = ref(false)

// Form data for each section
const databaseForm = ref({ url: '' })
const apiForm = ref({
  shutdown_timeout: '',
  jwt: { secret: '', expiry: '' },
})
const checkerForm = ref({
  workers: 0,
  latency_filter: '',
  public_refresh_interval: '',
  check_interval: '',
  xray: { admin_url: '', probe_url: '' },
})

// Backup for cancel functionality
const backupForms = ref({
  database: { url: '' },
  api: {
    shutdown_timeout: '',
    jwt: { secret: '', expiry: '' },
  },
  checker: {
    workers: 0,
    latency_filter: '',
    public_refresh_interval: '',
    check_interval: '',
    xray: { admin_url: '', probe_url: '' },
  },
})

const updateMutation = useMutation({
  mutationFn: (data: UpdateSettings) => updateSettings(data, baseURL),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['settings'] })
  },
})

function loadSettingsData() {
  if (settings.value) {
    databaseForm.value = { url: settings.value.database.url }
    apiForm.value = {
      shutdown_timeout: settings.value.api.shutdown_timeout,
      jwt: {
        secret: settings.value.api.jwt.secret,
        expiry: settings.value.api.jwt.expiry,
      },
    }
    checkerForm.value = {
      workers: settings.value.checker.workers,
      latency_filter: settings.value.checker.latency_filter,
      public_refresh_interval: settings.value.checker.public_refresh_interval,
      check_interval: settings.value.checker.check_interval,
      xray: {
        admin_url: settings.value.checker.xray.admin_url,
        probe_url: settings.value.checker.xray.probe_url,
      },
    }
    
    // Update backups
    backupForms.value = {
      database: { ...databaseForm.value },
      api: { ...apiForm.value, jwt: { ...apiForm.value.jwt } },
      checker: { ...checkerForm.value, xray: { ...checkerForm.value.xray } },
    }
  }
}

function startEditing(section: keyof typeof editingStates.value) {
  editingStates.value[section] = true
  // Update backup before editing
  if (section === 'database') {
    backupForms.value.database = { ...databaseForm.value }
  } else if (section === 'api') {
    backupForms.value.api = { ...apiForm.value, jwt: { ...apiForm.value.jwt } }
  } else if (section === 'checker') {
    backupForms.value.checker = { ...checkerForm.value, xray: { ...checkerForm.value.xray } }
  }
}

function cancelEditing(section: keyof typeof editingStates.value) {
  editingStates.value[section] = false
  // Restore from backup
  if (section === 'database') {
    databaseForm.value = { ...backupForms.value.database }
  } else if (section === 'api') {
    apiForm.value = { ...backupForms.value.api, jwt: { ...backupForms.value.api.jwt } }
  } else if (section === 'checker') {
    checkerForm.value = { ...backupForms.value.checker, xray: { ...backupForms.value.checker.xray } }
  }
}

async function saveSection(section: keyof typeof editingStates.value) {
  if (!settings.value) return
  
  const updateData: UpdateSettings = {
    database: { ...settings.value.database },
    api: { ...settings.value.api, jwt: { ...settings.value.api.jwt }, admin: { ...settings.value.api.admin } },
    checker: { ...settings.value.checker, xray: { ...settings.value.checker.xray } },
  }
  
  if (section === 'database') {
    updateData.database.url = databaseForm.value.url
  } else if (section === 'api') {
    updateData.api.shutdown_timeout = apiForm.value.shutdown_timeout
    updateData.api.jwt.secret = apiForm.value.jwt.secret
    updateData.api.jwt.expiry = apiForm.value.jwt.expiry
  } else if (section === 'checker') {
    updateData.checker.workers = checkerForm.value.workers
    updateData.checker.latency_filter = checkerForm.value.latency_filter
    updateData.checker.public_refresh_interval = checkerForm.value.public_refresh_interval
    updateData.checker.check_interval = checkerForm.value.check_interval
    updateData.checker.xray.admin_url = checkerForm.value.xray.admin_url
    updateData.checker.xray.probe_url = checkerForm.value.xray.probe_url
  }
  
  updateMutation.mutate(updateData)
  editingStates.value[section] = false
}

function handlePasswordChangeSuccess() {
  queryClient.invalidateQueries({ queryKey: ['settings'] })
}

watch(settings, () => {
  loadSettingsData()
}, { immediate: true })
</script>

<template>
  <div class="space-y-6">
    <UiCard>
      <CardHeader>
        <CardTitle>Application Settings</CardTitle>
      </CardHeader>
      <CardContent class="space-y-6">
        <div v-if="isLoading" class="text-center text-muted-foreground py-8">
          Loading settings...
        </div>
        <div v-else class="space-y-6">
          <Accordion type="multiple" class="w-full">
            <!-- Database Settings -->
            <AccordionItem value="database">
              <AccordionTrigger class="text-lg font-semibold">Database Settings</AccordionTrigger>
              <AccordionContent class="space-y-4 pt-4">
                <div class="space-y-2">
                  <label class="text-sm font-medium">Database URL</label>
                  <UiInput
                    v-model="databaseForm.url"
                    :disabled="!editingStates.database"
                    placeholder="postgres://user:pass@host:5432/db"
                    :class="{ 'bg-muted': !editingStates.database }"
                  />
                </div>
                <div class="flex justify-end gap-2">
                  <UiButton
                    v-if="editingStates.database"
                    variant="outline"
                    @click="cancelEditing('database')"
                  >
                    Cancel
                  </UiButton>
                  <UiButton
                    v-if="editingStates.database"
                    :disabled="updateMutation.isPending"
                    @click="saveSection('database')"
                  >
                    {{ updateMutation.isPending ? 'Saving...' : 'Save' }}
                  </UiButton>
                  <UiButton
                    v-else
                    @click="startEditing('database')"
                  >
                    Edit
                  </UiButton>
                </div>
              </AccordionContent>
            </AccordionItem>

            <!-- API Settings -->
            <AccordionItem value="api">
              <AccordionTrigger class="text-lg font-semibold">API Settings</AccordionTrigger>
              <AccordionContent class="space-y-4 pt-4">
                <div class="space-y-2">
                  <label class="text-sm font-medium">Shutdown Timeout</label>
                  <UiInput
                    v-model="apiForm.shutdown_timeout"
                    :disabled="!editingStates.api"
                    placeholder="10s"
                    :class="{ 'bg-muted': !editingStates.api }"
                  />
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium">JWT Secret</label>
                  <UiInput
                    v-model="apiForm.jwt.secret"
                    :disabled="!editingStates.api"
                    type="password"
                    placeholder="JWT secret key"
                    :class="{ 'bg-muted': !editingStates.api }"
                  />
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium">JWT Expiry</label>
                  <UiInput
                    v-model="apiForm.jwt.expiry"
                    :disabled="!editingStates.api"
                    placeholder="24h"
                    :class="{ 'bg-muted': !editingStates.api }"
                  />
                </div>
                
                <!-- Admin Credentials (Read-only) -->
                <div class="border-t pt-4 mt-4">
                  <h4 class="text-md font-semibold mb-3">Admin Credentials</h4>
                  <div class="space-y-2">
                    <label class="text-sm font-medium">Admin Login</label>
                    <UiInput
                      :model-value="settings?.api.admin.login || ''"
                      disabled
                      :class="{ 'bg-muted': true }"
                    />
                  </div>
                  <div class="flex justify-end mt-4">
                    <UiButton @click="passwordDialogOpen = true">
                      Change Password
                    </UiButton>
                  </div>
                </div>

                <div class="flex justify-end gap-2">
                  <UiButton
                    v-if="editingStates.api"
                    variant="outline"
                    @click="cancelEditing('api')"
                  >
                    Cancel
                  </UiButton>
                  <UiButton
                    v-if="editingStates.api"
                    :disabled="updateMutation.isPending"
                    @click="saveSection('api')"
                  >
                    {{ updateMutation.isPending ? 'Saving...' : 'Save' }}
                  </UiButton>
                  <UiButton
                    v-else
                    @click="startEditing('api')"
                  >
                    Edit
                  </UiButton>
                </div>
              </AccordionContent>
            </AccordionItem>

            <!-- Checker Settings -->
            <AccordionItem value="checker">
              <AccordionTrigger class="text-lg font-semibold">Checker Settings</AccordionTrigger>
              <AccordionContent class="space-y-4 pt-4">
                <div class="space-y-2">
                  <label class="text-sm font-medium">Workers</label>
                  <UiInput
                    v-model.number="checkerForm.workers"
                    :disabled="!editingStates.checker"
                    type="number"
                    placeholder="16"
                    :class="{ 'bg-muted': !editingStates.checker }"
                  />
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium">Latency Filter</label>
                  <UiInput
                    v-model="checkerForm.latency_filter"
                    :disabled="!editingStates.checker"
                    placeholder="500ms"
                    :class="{ 'bg-muted': !editingStates.checker }"
                  />
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium">Public Refresh Interval</label>
                  <UiInput
                    v-model="checkerForm.public_refresh_interval"
                    :disabled="!editingStates.checker"
                    placeholder="10m"
                    :class="{ 'bg-muted': !editingStates.checker }"
                  />
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium">Check Interval</label>
                  <UiInput
                    v-model="checkerForm.check_interval"
                    :disabled="!editingStates.checker"
                    placeholder="10m"
                    :class="{ 'bg-muted': !editingStates.checker }"
                  />
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium">Xray Admin URL</label>
                  <UiInput
                    v-model="checkerForm.xray.admin_url"
                    :disabled="!editingStates.checker"
                    placeholder="http://xray:10085"
                    :class="{ 'bg-muted': !editingStates.checker }"
                  />
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium">Xray Probe URL</label>
                  <UiInput
                    v-model="checkerForm.xray.probe_url"
                    :disabled="!editingStates.checker"
                    placeholder="https://www.google.com/generate_204"
                    :class="{ 'bg-muted': !editingStates.checker }"
                  />
                </div>
                <div class="flex justify-end gap-2">
                  <UiButton
                    v-if="editingStates.checker"
                    variant="outline"
                    @click="cancelEditing('checker')"
                  >
                    Cancel
                  </UiButton>
                  <UiButton
                    v-if="editingStates.checker"
                    :disabled="updateMutation.isPending"
                    @click="saveSection('checker')"
                  >
                    {{ updateMutation.isPending ? 'Saving...' : 'Save' }}
                  </UiButton>
                  <UiButton
                    v-else
                    @click="startEditing('checker')"
                  >
                    Edit
                  </UiButton>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </CardContent>
    </UiCard>

    <!-- Password Change Dialog -->
    <ChangePasswordDialog
      v-if="settings"
      v-model:open="passwordDialogOpen"
      :current-login="settings.api.admin.login"
      @success="handlePasswordChangeSuccess"
    />
  </div>
</template>
