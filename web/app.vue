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
  @apply bg-gray-50;
}
</style>