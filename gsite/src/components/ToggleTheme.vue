<template>
  <a
    role="button"
    @click.prevent="toggleTheme()"
    :aria-label="'Toggle ' + nextTheme"
    :title="'Toggle ' + nextTheme"
    class="toggle-theme"
  >
    <!-- Workaround to include theme variables in critical CSS. -->
    <span v-for="theme in themes" :key="theme" :data-theme="theme" />

    <svg
      v-if="current === 'light'"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="feather feather-sun"
    >
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>

    <svg
      v-else-if="current === 'dark'"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="feather feather-moon"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>

    <svg
      v-else-if="current === 'sepia'"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="feather feather-coffee"
    >
      <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
      <line x1="6" y1="1" x2="6" y2="4"></line>
      <line x1="10" y1="1" x2="10" y2="4"></line>
      <line x1="14" y1="1" x2="14" y2="4"></line>
    </svg>
  </a>
</template>

<script>
export default {
  data() {
    return {
      // themes: ["light", "sepia", "dark"],
      themes: ["light", "sepia"],
      current: "light",
    };
  },
  computed: {
    nextTheme() {
      const currentIndex = this.themes.indexOf(this.current);
      const nextIndex = (currentIndex + 1) % this.themes.length;
      return this.themes[nextIndex];
    },
  },
  methods: {
    toggleTheme() {
      const currentIndex = this.themes.indexOf(this.current);
      const nextIndex = (currentIndex + 1) % this.themes.length;
      window.__setPreferredTheme(this.themes[nextIndex]);
      this.current = this.themes[nextIndex];
    },
  },
  mounted() {
    if (window.__theme) {
      this.current = window.__theme;
    }
  },
};
</script>

<style lang="scss">
.toggle-theme {
  background-color: transparent;
  border: 0;
  color: currentColor;
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }
  &:focus {
    outline: none;
  }
}
</style>