<script setup lang="ts">
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Calendar, 
  Wallet, 
  Megaphone, 
  ChevronRight,
  ChevronLeft,
  Plus,
  Sun,
  Moon,
  ChevronDown
} from 'lucide-vue-next'

import { useSidebarStore } from '../../stores/sidebar'

const sidebar = useSidebarStore()
const colorMode = useColorMode()

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'audience', label: 'Audience', icon: Users, hasDropdown: true },
  { id: 'posts', label: 'Posts', icon: FileText, badge: '8', badgeColor: 'bg-green-500' },
  { id: 'schedules', label: 'Schedules', icon: Calendar, badge: '3', badgeColor: 'bg-orange-500', hasAdd: true },
  { id: 'income', label: 'Income', icon: Wallet, hasDropdown: true },
  { id: 'promote', label: 'Promote', icon: Megaphone, hasDropdown: true },
]

const incomeSubItems = [
  { id: 'earnings', label: 'Earnings' },
  { id: 'refunds', label: 'Refunds', hasDropdown: true },
  { id: 'decline', label: 'Decline' },
  { id: 'payouts', label: 'Payouts' },
]

const handleNavClick = (itemId: string) => {
  sidebar.setActive(itemId)
  if (sidebar.isExpanded) {
    sidebar.toggleMenu(itemId)
  }
}

const toggleTheme = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <aside 
    class="h-screen flex flex-col border-r bg-white dark:bg-gray-900 transition-all duration-300"
    :class="sidebar.isExpanded ? 'w-72' : 'w-20'"
  >
    <!-- Top Section -->
    <div class="flex items-center justify-between p-4 border-b">
      <!-- Window Controls -->
      <div class="flex gap-2" v-if="sidebar.isExpanded">
        <div class="w-3 h-3 rounded-full bg-red-500" />
        <div class="w-3 h-3 rounded-full bg-yellow-500" />
        <div class="w-3 h-3 rounded-full bg-green-500" />
      </div>
      
      <!-- Logo -->
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
          O
        </div>
        <span v-if="sidebar.isExpanded" class="font-semibold text-lg">Outless</span>
      </div>
      
      <!-- Toggle Button -->
      <button 
        @click="sidebar.toggle"
        class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <ChevronLeft v-if="sidebar.isExpanded" class="w-5 h-5" />
        <ChevronRight v-else class="w-5 h-5" />
      </button>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 p-4 space-y-2 overflow-y-auto">
      <template v-for="item in navItems" :key="item.id">
        <div class="relative group">
          <!-- Main Nav Item -->
          <button
            @click="handleNavClick(item.id)"
            class="w-full flex items-center justify-between p-3 rounded-lg transition-colors"
            :class="sidebar.activeItem === item.id 
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'"
          >
            <div class="flex items-center gap-3">
              <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
              <span v-if="sidebar.isExpanded" class="font-medium">{{ item.label }}</span>
            </div>
            
            <div class="flex items-center gap-2" v-if="sidebar.isExpanded">
              <span 
                v-if="item.badge" 
                class="px-2 py-0.5 text-xs text-white rounded-full"
                :class="item.badgeColor"
              >
                {{ item.badge }}
              </span>
              <Plus v-if="item.hasAdd" class="w-4 h-4 text-gray-400" />
              <ChevronDown 
                v-if="item.hasDropdown" 
                class="w-4 h-4 transition-transform"
                :class="sidebar.isMenuOpen(item.id) ? 'rotate-180' : ''"
              />
            </div>
          </button>

          <!-- Submenu for Income (Expanded) -->
          <div 
            v-if="item.id === 'income' && sidebar.isExpanded && sidebar.isMenuOpen('income')"
            class="ml-11 mt-2 space-y-1"
          >
            <button
              v-for="subItem in incomeSubItems"
              :key="subItem.id"
              class="w-full flex items-center justify-between p-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <span>{{ subItem.label }}</span>
              <ChevronRight v-if="subItem.hasDropdown" class="w-4 h-4" />
            </button>
          </div>

          <!-- Hover Menu for Collapsed -->
          <div 
            v-if="!sidebar.isExpanded && item.hasDropdown"
            class="absolute left-full top-0 ml-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50"
          >
            <div class="relative group">
              <button
                class="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <component :is="item.icon" class="w-4 h-4" />
                <span>{{ item.label }}</span>
              </button>
              
              <!-- Income Submenu in Collapsed Mode -->
              <div v-if="item.id === 'income'" class="mt-2 space-y-1">
                <button
                  v-for="subItem in incomeSubItems"
                  :key="subItem.id"
                  class="w-full flex items-center justify-between p-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <span>{{ subItem.label }}</span>
                  <ChevronRight v-if="subItem.hasDropdown" class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </nav>

    <!-- Upload Section -->
    <div v-if="sidebar.isExpanded" class="px-4 py-4">
      <div class="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer">
        <Plus class="w-8 h-8 mx-auto text-gray-400 mb-2" />
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Upload new image</p>
        <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">Drag and drop</p>
      </div>
    </div>

    <!-- Bottom Section -->
    <div class="p-4 border-t">
      <ClientOnly>
        <!-- Theme Toggle -->
        <div v-if="sidebar.isExpanded" class="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            @click="toggleTheme"
            class="flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-colors"
            :class="colorMode.value === 'light' ? 'bg-white dark:bg-gray-700 shadow' : 'text-gray-500'"
          >
            <Sun class="w-4 h-4" />
            <span class="text-sm font-medium">Light</span>
          </button>
          <button
            @click="toggleTheme"
            class="flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-colors"
            :class="colorMode.value === 'dark' ? 'bg-white dark:bg-gray-700 shadow' : 'text-gray-500'"
          >
            <Moon class="w-4 h-4" />
            <span class="text-sm font-medium">Dark</span>
          </button>
        </div>

        <!-- Collapsed Theme Toggle -->
        <button
          v-else
          @click="toggleTheme"
          class="w-full flex items-center justify-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Sun v-if="colorMode.value === 'light'" class="w-5 h-5" />
          <Moon v-else class="w-5 h-5" />
        </button>
      </ClientOnly>
    </div>
  </aside>
</template>
