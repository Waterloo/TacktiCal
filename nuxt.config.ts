// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss'],
  vite: {
    server: {
      fs: {
        allow: [
          './',
          '../',
          'C:/Users/Jithin/Downloads/project-notes/project'  // 👈 add this
        ]
      }
    }
  }
})
