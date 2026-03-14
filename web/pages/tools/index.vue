<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
    <!-- Page Header -->
    <div class="mb-12 text-center sm:mb-16">
      <h1 class="mb-3 text-4xl font-bold text-zinc-900 transform -rotate-1 font-hand sm:mb-4 sm:text-5xl">Tools Playground</h1>
      <p class="text-lg text-zinc-600 font-hand sm:text-2xl">Writing, AI, utility, and sketch tools collected in one hand-drawn toolbox.</p>
    </div>

    <!-- Tools Grid -->
    <div class="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
      <CatalogCard
        v-for="tool in tools"
        :key="tool.to"
        :to="tool.to"
        :title="tool.title"
        :description="tool.description"
        :tags="tool.tags.map(t => ({ label: t.label, tone: t.color as any }))"
        :aria-label="'Try ' + tool.title"
        title-class="text-xl sm:text-2xl"
        font-hand
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { toolsCatalog } from '~/utils/tools/catalog'

definePageMeta({ layout: 'default' })
// 工具列表配置
const tools = toolsCatalog
</script>

<style scoped>
/* 工具卡片复用样式，已在组件内 V-for 渲染 */
</style> 
