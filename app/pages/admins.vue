<script setup lang="ts">
import UiPageLayout from '~/components/ui/page-layout/page-layout.vue'
import UiAdminList from '~/components/ui/admin-list/admin-list.vue'

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <UiPageLayout
    title="Admins"
    description="Manage admin users"
  >
    <UiAdminList />
  </UiPageLayout>
</template>
