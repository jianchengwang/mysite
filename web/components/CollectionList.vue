<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <!-- Page Header -->
    <div class="mb-12">
      <h1 class="text-4xl font-bold text-zinc-900 mb-4">{{ title }}</h1>
      <p class="text-lg text-zinc-600">{{ subtitle }}</p>
    </div>
    <!-- Store Grid -->
    <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      <NuxtLink v-for="item in list" :key="(item as any).path" :to="(item as any).path"
        class="group bg-zinc-50 rounded-lg border border-zinc-200 hover:border-zinc-300 transition-all duration-200 overflow-hidden">
        <div class="p-6">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-xl font-bold text-zinc-800 group-hover:text-zinc-600">
              {{ (item as any).title }}
            </h2>
          </div>
          <p class="text-zinc-600 mb-4">{{ (item as any).description }}</p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'
import type { PropType } from 'vue'

interface CollectionItem { path: string; title: string; description: string }
const props = defineProps({
  title: String,
  subtitle: String,
  list: { type: Array as PropType<CollectionItem[]>, required: true }
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