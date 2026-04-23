import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSidebarStore = defineStore('sidebar', () => {
  const isExpanded = ref(true)
  const activeItem = ref('dashboard')
  const openMenus = ref<Set<string>>(new Set())

  const toggle = () => {
    isExpanded.value = !isExpanded.value
  }

  const setActive = (item: string) => {
    activeItem.value = item
  }

  const toggleMenu = (menuId: string) => {
    if (openMenus.value.has(menuId)) {
      openMenus.value.delete(menuId)
    } else {
      openMenus.value.add(menuId)
    }
    openMenus.value = new Set(openMenus.value)
  }

  const isMenuOpen = (menuId: string) => {
    return openMenus.value.has(menuId)
  }

  return {
    isExpanded,
    activeItem,
    openMenus,
    toggle,
    setActive,
    toggleMenu,
    isMenuOpen,
  }
})
