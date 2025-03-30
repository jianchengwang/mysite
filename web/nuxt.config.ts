// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/content',
    'nuxt-primevue'
  ],

  css: ['~/assets/css/prose.css'],

  primevue: {
    components: {
      include: [
        'Button',
        'Card',
        'DataTable',
        'InputText',
        'Toast',
        'Dialog',
        'Menu',
        'Menubar',
        'Sidebar',
        'Divider'
      ]
    },
    options: {
      ripple: true,
      inputStyle: 'filled'
    },
    cssLayerOrder: 'tailwind-base, primevue, tailwind-utilities'
  },

  content: {
    build: {
      markdown: {
        highlight: {
          theme: 'github-dark',
          langs: ['json', 'js', 'ts', 'html', 'css', 'vue', 'bash', 'markdown', 'yaml', 'java', 'go', 'sql', 'rust', 'python', 'docker']
        },
        toc: {
          depth: 3,
          searchDepth: 3
        }
      }
    },
  },

  app: {
    head: {
      title: 'JianchengWang',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'My personal website and blog' }
      ],
      script: [
        { src: 'https://cdn.jsdelivr.net/gh/jianchengwang/live2d_models@main/assets/js/live2dv3.init.js' }
      ],
      link: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
        }
      ]
    }
  },

  tailwindcss: {
    config: {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
          },
          colors: {
            primary: {
              50: '#f0f9ff',
              100: '#e0f2fe',
              200: '#bae6fd',
              300: '#7dd3fc',
              400: '#38bdf8',
              500: '#0ea5e9',
              600: '#0284c7',
              700: '#0369a1',
              800: '#075985',
              900: '#0c4a6e',
            },
          },
          typography: {
            DEFAULT: {
              css: {
                maxWidth: 'none',
                color: '#333',
                a: {
                  color: '#0284c7',
                  '&:hover': {
                    color: '#0369a1',
                  },
                },
                h1: {
                  color: '#111827',
                  fontWeight: '600',
                },
                h2: {
                  color: '#111827',
                  fontWeight: '600',
                },
                h3: {
                  color: '#111827',
                  fontWeight: '600',
                },
                h4: {
                  color: '#111827',
                  fontWeight: '600',
                },
                strong: {
                  color: '#111827',
                },
                code: {
                  color: '#111827',
                  '&::before': {
                    content: '""',
                  },
                  '&::after': {
                    content: '""',
                  },
                },
                pre: {
                  backgroundColor: '#1f2937',
                  color: '#e5e7eb',
                },
              },
            },
          },
        },
      },
    },
  },

  compatibilityDate: '2025-03-29',
})