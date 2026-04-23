<script setup lang="ts">
import { useSettings } from "../../features/settings/composables/useSettings"
import { Button } from "~/components/ui/button"
import { Card } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Save } from "lucide-vue-next"
import { ref, watch } from "vue"

const { settings, isPending, updateSettings, isUpdating } = useSettings()

const localSettings = ref<any>(null)

const onSave = () => {
  if (localSettings.value) {
    updateSettings(localSettings.value)
  }
}

watch(settings, (newSettings) => {
  if (newSettings) {
    localSettings.value = JSON.parse(JSON.stringify(newSettings))
  }
}, { immediate: true })
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold">Settings</h1>
      <Button @click="onSave" :disabled="isUpdating">
        <Save class="w-4 h-4 mr-2" />
        {{ isUpdating ? "Saving..." : "Save" }}
      </Button>
    </div>

    <div v-if="isPending" class="text-center py-8">
      Loading settings...
    </div>

    <div v-else-if="!settings" class="text-center py-8 text-muted-foreground">
      No settings found
    </div>

    <div v-else-if="localSettings" class="space-y-6">
      <Card class="p-6">
        <h2 class="text-xl font-bold mb-4">Database</h2>
        <div class="space-y-4">
          <div>
            <Label for="db-url">Database URL</Label>
            <Input id="db-url" v-model="localSettings.database.url" />
          </div>
        </div>
      </Card>

      <Card class="p-6">
        <h2 class="text-xl font-bold mb-4">API</h2>
        <div class="space-y-4">
          <div>
            <Label for="api-shutdown">Shutdown Timeout</Label>
            <Input id="api-shutdown" v-model="localSettings.api.shutdown_timeout" />
          </div>
          <div>
            <Label for="jwt-secret">JWT Secret</Label>
            <Input id="jwt-secret" v-model="localSettings.api.jwt.secret" type="password" />
          </div>
          <div>
            <Label for="jwt-expiry">JWT Expiry</Label>
            <Input id="jwt-expiry" v-model="localSettings.api.jwt.expiry" />
          </div>
        </div>
      </Card>

      <Card class="p-6">
        <h2 class="text-xl font-bold mb-4">Checker</h2>
        <div class="space-y-4">
          <div>
            <Label for="checker-workers">Workers</Label>
            <Input id="checker-workers" v-model.number="localSettings.checker.workers" type="number" />
          </div>
          <div>
            <Label for="checker-latency">Latency Filter</Label>
            <Input id="checker-latency" v-model="localSettings.checker.latency_filter" />
          </div>
          <div>
            <Label for="checker-refresh">Public Refresh Interval</Label>
            <Input id="checker-refresh" v-model="localSettings.checker.public_refresh_interval" />
          </div>
          <div>
            <Label for="checker-interval">Check Interval</Label>
            <Input id="checker-interval" v-model="localSettings.checker.check_interval" />
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>
