<script setup lang="ts">
import { ref } from 'vue'
import UiPageLayout from '~/components/ui/page-layout/page-layout.vue'
import NodeList from '~/components/NodeList.vue'
import PublicSourceList from '~/components/ui/public-source-list/public-source-list.vue'
import UiButton from '~/components/ui/button/button.vue'
import Dialog from '~/components/ui/dialog/Dialog.vue'
import DialogContent from '~/components/ui/dialog/DialogContent.vue'
import DialogDescription from '~/components/ui/dialog/DialogDescription.vue'
import DialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '~/components/ui/dialog/DialogTitle.vue'

definePageMeta({
  layout: 'default',
})

const isPublicSourcesDialogOpen = ref(false)
</script>

<template>
  <UiPageLayout
    title="Nodes"
    description="Manage your proxy nodes"
  >
    <div class="flex justify-end mb-4">
      <UiButton
        variant="outline"
        @click="isPublicSourcesDialogOpen = true"
      >
        Manage Public Sources
      </UiButton>
    </div>
    <NodeList />

    <Dialog :open="isPublicSourcesDialogOpen" @update:open="isPublicSourcesDialogOpen = $event">
      <DialogContent class="w-[95vw] sm:max-w-[1100px] h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Public Sources</DialogTitle>
          <DialogDescription>
            Manage public subscription sources without leaving the nodes page.
          </DialogDescription>
        </DialogHeader>
        <div class="min-h-0 flex-1 overflow-y-auto pt-2 pr-1">
          <PublicSourceList />
        </div>
      </DialogContent>
    </Dialog>
  </UiPageLayout>
</template>
