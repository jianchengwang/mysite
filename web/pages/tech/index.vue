<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <!-- Page Header -->
    <div class="mb-12">
      <h1 class="text-4xl font-bold text-zinc-900 mb-4">Store</h1>
      <p class="text-lg text-zinc-600">Browse through my written collection of stores.</p>
    </div>

    <!-- Store Grid -->
    <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      <NuxtLink v-for="item in list" :key="item.path" :to="item.path"
        class="group bg-zinc-50 rounded-lg border border-zinc-200 hover:border-zinc-300 transition-all duration-200 overflow-hidden">
        <!-- Item Details -->
        <div class="p-6">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-xl font-bold text-zinc-800 group-hover:text-zinc-600">
              {{ item.title }}
            </h2>
          </div>
          <p class="text-zinc-600 mb-4">{{ item.description }}</p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const { data: list } = await useAsyncData(() => {
  return queryCollection('tech').select('path', 'title', 'description').all()
})
definePageMeta({
  layout: 'default'
})
</script>

<style scoped>
.aspect-w-16 {
  position: relative;
  padding-bottom: 56.25%;
}

.aspect-w-16>* {
  position: absolute;
  height: 100%;
  width: 100%;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}
</style>