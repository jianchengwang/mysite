<template>
  <header class="bg-white border-b-2 border-zinc-900 sticky top-0 z-50">
    <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
      <NuxtLink to="/" class="text-3xl font-bold font-hand text-zinc-900 hover:text-zinc-700 transition-colors">
        JianchengWang
      </NuxtLink>

      <div class="flex items-center space-x-6">
        <NuxtLink to="/tech" class="text-lg font-medium text-zinc-700 hover:text-zinc-900 sketch-nav-link" active-class="active">
          Tech
        </NuxtLink>
        <NuxtLink to="/store" class="text-lg font-medium text-zinc-700 hover:text-zinc-900 sketch-nav-link" active-class="active">
          Store
        </NuxtLink>
        <NuxtLink to="/column" class="text-lg font-medium text-zinc-700 hover:text-zinc-900 sketch-nav-link" active-class="active">
          Column
        </NuxtLink>
        <NuxtLink to="/english" class="text-lg font-medium text-zinc-700 hover:text-zinc-900 sketch-nav-link" active-class="active">
          English
        </NuxtLink>
        <NuxtLink to="/tools" class="text-lg font-medium text-zinc-700 hover:text-zinc-900 sketch-nav-link" active-class="active">
          Tools
        </NuxtLink>
        <NuxtLink to="/links" class="text-lg font-medium text-zinc-700 hover:text-zinc-900 sketch-nav-link" active-class="active">
          Links
        </NuxtLink>
        <NuxtLink to="/about" class="text-lg font-medium text-zinc-700 hover:text-zinc-900 sketch-nav-link" active-class="active">
          About
        </NuxtLink>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.sketch-nav-link {
  @apply relative;
}

.sketch-nav-link::after {
  content: '';
  position: absolute;
  width: 0%;
  height: 2px;
  bottom: -4px;
  left: -2px;
  right: -2px;
  background-color: #18181b;
  transition: width 0.3s ease;
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
}

.sketch-nav-link:hover::after,
.sketch-nav-link.active::after {
  @apply w-full;
}

.sketch-nav-link.active {
  @apply text-zinc-900 font-bold;
}
</style>