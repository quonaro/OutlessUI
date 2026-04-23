import { useColorMode } from '@vueuse/core'
import { useThemeStore } from '../../stores/theme'

export function useTheme() {
  const colorMode = useColorMode({
    attribute: 'class',
    selector: 'html',
  })

  const themeStore = useThemeStore()

  const isDark = computed(() => colorMode.value === 'dark')

  const setTheme = (theme: 'light' | 'dark' | 'system') => {
    themeStore.setTheme(theme)

    if (theme === 'system') {
      colorMode.value = 'auto'
    } else {
      colorMode.value = theme
    }
  }

  const toggleTheme = () => {
    if (colorMode.value === 'dark') {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  }

  // Initialize theme from store on mount
  onMounted(() => {
    setTheme(themeStore.theme)
  })

  return {
    isDark,
    setTheme,
    toggleTheme,
  }
}
