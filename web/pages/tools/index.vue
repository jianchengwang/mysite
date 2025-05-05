<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <!-- Page Header -->
    <div class="mb-12">
      <h1 class="text-4xl font-bold text-zinc-900 mb-4">Developer Tools</h1>
      <p class="text-lg text-zinc-600">A collection of useful tools for developers</p>
    </div>

    <!-- Tools Grid -->
    <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="tool in tools"
        :key="tool.to"
        :to="tool.to"
        class="group bg-white rounded-lg border border-zinc-200 hover:border-zinc-300 transition-all duration-200 overflow-hidden"
      >
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-zinc-800 group-hover:text-zinc-600">
              {{ tool.title }}
            </h2>
            <i class="pi pi-arrow-right text-zinc-400 group-hover:text-zinc-600 transition-colors"></i>
          </div>
          <p class="text-zinc-600 mb-4">{{ tool.description }}</p>
          <div class="flex gap-2">
            <span
              v-for="tag in tool.tags"
              :key="tag.label"
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              :class="tag.color === 'green' ? 'bg-green-100 text-green-800' : 'bg-indigo-100 text-indigo-800'"
            >
              {{ tag.label }}
            </span>
          </div>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })
// 工具列表配置
const tools = [
  {
    to: '/tools/english-chunk',
    title: 'English Chunk Generator',
    description: 'Generate common English chunks with example sentences for daily routines, work life, and more.',
    tags: [
      { label: 'AI-Powered', color: 'indigo' },
      { label: 'Free', color: 'green' }
    ]
  },
  {
    to: '/tools/live2d',
    title: 'Live2D Talk',
    description: 'Chat with a cute anime character.',
    tags: [
      { label: 'Feature Tag', color: 'indigo' },
      { label: 'Free', color: 'green' }
    ]
  },
  {
    to: '/tools/prompt-collection',
    title: 'Prompt Collection',
    description: 'A collection of useful prompts for AI.',
    tags: [
      { label: 'Templates', color: 'indigo' },
      { label: 'Free', color: 'green' }
    ]
  },
  {
    to: '/tools/md-to-wechat',
    title: 'Markdown To WeChat',
    description: 'Convert Markdown documents to beautiful WeChat articles, with code highlighting, tables, and customizable themes.',
    tags: [
      { label: 'Format Conversion', color: 'indigo' },
      { label: 'Free', color: 'green' }
    ]
  },
  {
    to: '/tools/qwerty',
    title: 'Qwerty',
    description: 'Practice your typing skills with Qwerty.',
    tags: [
      { label: 'Typing Practice', color: 'indigo' },
      { label: 'Free', color: 'green' }
    ]
  },
  {
    to: '/tools/modbus',
    title: 'Modbus',
    description: 'Parse Modbus data.',
    tags: [
      { label: 'Modbus', color: 'indigo' },
      { label: 'Free', color: 'green' }
    ]
  },
  {
    to: '/tools/paper-split',
    title: 'Paper Split',
    description: 'Split a paper into multiple questions.',
    tags: [
      { label: 'Paper Split', color: 'indigo' },
      { label: 'Free', color: 'green' }
    ]
  },
  {
    to: '/tools/xai',
    title: 'XAI Chat',
    description: 'Chat with XAI.',
    tags: [
      { label: 'XAI', color: 'indigo' },
      { label: 'Free', color: 'green' }
    ]
  },
]
</script>

<style scoped>
/* 工具卡片复用样式，已在组件内 V-for 渲染 */
</style> 