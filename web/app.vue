<template>
  <div class="min-h-screen bg-gray-50">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
// App.vue is the main component that wraps all pages
</script>

<style>
/* Global styles */
html {
  scroll-behavior: smooth;
}

body {
  @apply bg-zinc-50 text-zinc-900 font-sans;
}

h1, h2, h3, h4, h5, h6 {
  @apply font-hand;
}
</style>