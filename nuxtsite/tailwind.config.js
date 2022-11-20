/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  darkMode: ['class', '[data-mode="dark"]'],
  content: [
    "components",
    "pages"
  ],
  theme: {
    extend: {
      fontFamily: {
        'header': ['Cabinet Grotesk', ...defaultTheme.fontFamily.sans],
        'sans': ['Satoshi', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  variants: {
    typography: ["responsive", "dark"]
  },
  plugins: [
    require('@tailwindcss/typography'),
    // ...
  ],
}