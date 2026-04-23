<script setup lang="ts">
import UiPageLayout from '~/components/ui/page-layout/page-layout.vue'
import UiSettingsForm from '~/components/ui/settings-form/settings-form.vue'

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <UiPageLayout
    title="Settings"
    description="Manage your application settings"
  >
    <UiSettingsForm />
  </UiPageLayout>
</template>
