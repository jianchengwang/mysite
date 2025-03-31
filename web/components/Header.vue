<template>
  <header class="bg-zinc-50 shadow-sm border-b border-zinc-200">
    <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <NuxtLink to="/" class="text-2xl font-medium text-zinc-800 hover:text-zinc-600">
        JianchengWang
      </NuxtLink>

      <div class="flex items-center space-x-8">
        <NuxtLink to="/tech" class="font-medium text-zinc-600 hover:text-zinc-800 transition-colors">
          Tech
        </NuxtLink>
        <NuxtLink to="/store" class="font-medium text-zinc-600 hover:text-zinc-800 transition-colors">
          Store
        </NuxtLink>
        <NuxtLink to="/column" class="font-medium text-zinc-600 hover:text-zinc-800 transition-colors">
          Column
        </NuxtLink>
        <NuxtLink to="/tools" class="font-medium text-zinc-600 hover:text-zinc-800 transition-colors">
          Tools
        </NuxtLink>
        <NuxtLink to="/links" class="font-medium text-zinc-600 hover:text-zinc-800 transition-colors">
          Links
        </NuxtLink>
        <NuxtLink to="/about" class="font-medium text-zinc-600 hover:text-zinc-800 transition-colors">
          About
        </NuxtLink>
      </div>
    </nav>
  </header>
</template>

<style scoped>
/* Active link style */
.router-link-active {
  @apply text-zinc-900 border-b-2 border-zinc-800;
}
</style>