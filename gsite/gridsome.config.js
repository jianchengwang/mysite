// This is where project configuration and plugin options are located.
// Learn more: https://gridsome.org/docs/config

// Changes here require a server restart.
// To restart press CTRL + C in terminal and run `gridsome develop`

module.exports = {
  siteName: 'JianchengwangのSite',
  siteUrl: 'http://jianchengwang.info',
  plugins: [
    {
      use: '@gridsome/plugin-sitemap',
      options: {
        config: {
          '/tech/*': {
            changefreq: 'weekly',
            priority: 0.5,
            lastmod: '2020-02-19',
          },
          '/life/*': {
            changefreq: 'weekly',
            priority: 0.5,
            lastmod: '2020-02-19',
          },
        }
      }
    },
    {
      use: "gridsome-plugin-tailwindcss2",
      options: {
        tailwindConfigFile: './tailwind.config.js',
        mainCssFile: './src/assets/style/main.css',
      }
    },
    {
      use: '@gridsome/source-filesystem',
      options: {
        path: './src/content/**/*.md',
        typeName: 'Content',
        remark: {
          externalLinksTarget: '_blank',
          externalLinksRel: ['noopener', 'noreferrer'],
        },
      }
    },
    {
      use: '@gridsome/source-filesystem',
      options: {
        path: './ob/tech/*.md',
        typeName: 'TechPost',
        remark: {
          externalLinksTarget: '_blank',
          externalLinksRel: ['noopener', 'noreferrer'],
          plugins: [
            ['@gridsome/remark-prismjs', 
              { 
                showLineNumbers: true,
              }
            ],
            '@noxify/gridsome-remark-table-align'
          ]
        },
      },
    },
    {
      use: '@gridsome/source-filesystem',
      options: {
        path: './ob/life/*.md',
        typeName: 'LifePost',
        remark: {
          externalLinksTarget: '_blank',
          externalLinksRel: ['noopener', 'noreferrer']
        },
      },
    },
    {
      use: '@gridsome/source-filesystem',
      options: {
        path: './ob/store/*.md',
        typeName: 'StorePost',
        remark: {
          externalLinksTarget: '_blank',
          externalLinksRel: ['noopener', 'noreferrer'],
        },
      },
    },
    {
      use: '@gridsome/source-filesystem',
      options: {
        path: './ob/book/*.md',
        typeName: 'BookPost',
        remark: {
          externalLinksTarget: '_blank',
          externalLinksRel: ['noopener', 'noreferrer'],
        },
      },
    },
  ],
  transformers: {
    remark: {
      // global remark options
    }
  },
  templates: {
    TechPost: '/tech/:slug',
    LifePost: '/life/:slug',
    StorePost: '/store/:slug',
    BookPost: '/book/:slug'
  },
  chainWebpack: config => {
    const svgRule = config.module.rule('svg')
    svgRule.uses.clear()
    svgRule
      .use('vue-svg-loader')
      .loader('vue-svg-loader')
  }
}
