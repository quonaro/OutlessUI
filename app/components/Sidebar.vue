<script setup lang="ts">
import {
  LayoutDashboard,
  Server,
  Settings,
  Users
} from 'lucide-vue-next'

import { useSidebarStore } from '../../stores/sidebar'
import logoImage from '~/assets/img/logo-d-a.webp'
import ThemeToggle from './ThemeToggle.vue'

const sidebar = useSidebarStore()
const route = useRoute()

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'servers', label: 'Servers', icon: Server, path: '/servers' },
  { id: 'users', label: 'Users', icon: Users, path: '/users' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
]

const activeItem = computed(() => {
  const activeNav = navItems.find(item => route.path === item.path)
  return activeNav?.id || 'dashboard'
})

const handleNavClick = (path: string) => {
  navigateTo(path)
}

</script>

<template>
  <aside
    class="h-screen flex flex-col border-r bg-background transition-all duration-300"
    :class="sidebar.isExpanded ? 'w-72' : 'w-20'"
  >

    <!-- Logo Section -->
    <div class="p-4 border-b border-border">
      <div class="flex items-center gap-3">
        <img
          :src="logoImage"
          alt="Outless Logo"
          class="w-12 h-12 flex-shrink-0"
        />
        <span v-if="sidebar.isExpanded" class="font-bold text-lg text-foreground">
          Outless
        </span>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 p-4 space-y-2 overflow-y-auto">
      <template v-for="item in navItems" :key="item.id">
        <div class="relative group">
          <!-- Main Nav Item -->
          <button
            @click="handleNavClick(item.path)"
            class="w-full flex items-center justify-between p-3 rounded-lg transition-colors"
            :class="activeItem === item.id
              ? 'bg-primary/10 text-primary dark:bg-primary/20'
              : 'hover:bg-accent text-muted-foreground hover:text-foreground'"
          >
            <div class="flex items-center gap-3">
              <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
              <span v-if="sidebar.isExpanded" class="font-medium">{{ item.label }}</span>
            </div>

          </button>

        </div>
      </template>
    </nav>

  </aside>
</template>
