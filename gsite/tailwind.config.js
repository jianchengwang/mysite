/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  purge: {
    content: [
        './src/**/*.vue',
        './src/**/*.js',
        './src/**/*.jsx',
        './src/**/*.html',
        './src/**/*.pug',
        './src/**/*.md'
    ]
  },
  theme: {
    extend: {
      fontFamily: {
        'header': ['Cabinet Grotesk', ...defaultTheme.fontFamily.sans],
        'sans': ['Satoshi', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    // ...
  ],
}