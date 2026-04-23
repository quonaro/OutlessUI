import { defineStore } from 'pinia'

export type Theme = 'light' | 'dark' | 'system'

export const useThemeStore = defineStore('theme', {
  state: (): { theme: Theme } => ({
    theme: 'system',
  }),

  getters: {
    isDark: (state) => {
      if (state.theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
      }
      return state.theme === 'dark'
    },
  },

  actions: {
    setTheme(theme: Theme) {
      this.theme = theme
    },

    toggleTheme() {
      if (this.theme === 'light') {
        this.theme = 'dark'
      } else if (this.theme === 'dark') {
        this.theme = 'light'
      } else {
        // system preference
        this.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'dark'
      }
    },
  },
})
