<script setup lang="ts">
import UiPageLayout from '~/components/ui/page-layout/page-layout.vue'
import NodeList from '~/components/NodeList.vue'

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <UiPageLayout
    title="Nodes"
    description="Manage your proxy nodes"
  >
    <NodeList />
  </UiPageLayout>
</template>
