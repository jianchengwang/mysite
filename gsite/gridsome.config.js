// This is where project configuration and plugin options are located.
// Learn more: https://gridsome.org/docs/config

// Changes here require a server restart.
// To restart press CTRL + C in terminal and run `gridsome develop`

module.exports = {
  siteName: 'JianchengwangのSite',
  plugins: [
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
        path: './ob/**/*.md',
        typeName: 'Post',
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
    }
  ],
  transformers: {
    remark: {
      // global remark options
    }
  },
  templates: {
    Post: '/posts/:slug',
  },
  chainWebpack: config => {
    const svgRule = config.module.rule('svg')
    svgRule.uses.clear()
    svgRule
      .use('vue-svg-loader')
      .loader('vue-svg-loader')
  }
}
