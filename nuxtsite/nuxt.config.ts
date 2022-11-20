// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  modules: ['@nuxt/content', '@nuxtjs/tailwindcss', '@nuxtjs/color-mode'],
  content: {
    ignores: [
      '.git',
      '.obsidian',
      'attach',
      'media',
    ],
    // https://content.nuxtjs.org/api/configuration
    highlight: {
      theme: {
        // Default theme (same as single string)
        default: 'material-palenight',
        // Theme used if `html.dark`
        dark: 'github-dark',
        sepia: 'monokai'
      },
      preload: [
        'c',
        'java',
        'kotlin',
        'go',
        'python',
        'rust',
        'toml',
        'dart',
        'sql',
        'shellscript',
        'docker'
      ]
    },
    markdown: {
      toc: {
        depth: 5,
        searchDepth: 5
      },
    }
  },
  tailwindcss: {
    cssPath: '~/assets/css/main.css',
  },
  app: {
    head: {
      title: 'JianchengwangのSite',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ],
      script: [
        { src: 'https://cdn.jsdelivr.net/gh/jianchengwang/live2d_models@main/assets/js/live2dv3.init.js', mode: 'client' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.gstatic.com' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;700&display=swap' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,700;1,400;1,700&display=swap' }
      ],
      // please note that this is an area that is likely to change
      style: [
      ],
      noscript: [
        // <noscript>Javascript is required</noscript>
        { children: 'Javascript is required' }
      ]
    }
  },
  components: false,
  buildModules: ['nuxt-build-optimisations'],
  build: {
    cache: true,
    parallel: true
  }
})
