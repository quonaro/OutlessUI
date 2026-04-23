// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',

  devtools: { enabled: true },

  future: {
    compatibilityVersion: 4,
  },


  app: {
    head: {
      title: 'Outless',
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/favicon/favicon-96x96.png' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon/favicon.svg' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/favicon/apple-touch-icon.png' },
        { rel: 'manifest', href: '/favicon/site.webmanifest' },
      ],
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },

  components: {
    dirs: [
      {
        path: '~/app/components',
        pathPrefix: false,
      },
      {
        path: '~/features',
        pathPrefix: false,
      },
    ],
  },

  modules: [
    '@nuxtjs/color-mode',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    'shadcn-nuxt',
    '@nuxt/eslint',
  ],

  colorMode: {
    preference: 'system',
    fallback: 'light',
    classSuffix: '',
    storageKey: 'outless-theme',
  },

  css: ['./app/assets/css/main.css'],

  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE_URL || '/api/v1',
    },
    private: {
      backendUrl: process.env.BACKEND_URL || 'http://localhost:41220',
    },
  },

  devServer: {
    port: 41221,
    host: '0.0.0.0',
  },

  typescript: {
    strict: true,
    typeCheck: process.env.NODE_ENV === 'production',
  },

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  vite: {
    resolve: {
      alias: {
        '~/features': './features',
        '~/stores': './stores',
      },
    },
    server: {
      allowedHosts: ['x.locrun.su'],
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
      proxy: {
        '/api': {
          target: process.env.BACKEND_URL || 'http://localhost:41220',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  },
})
