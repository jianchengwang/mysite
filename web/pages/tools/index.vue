<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <!-- Page Header -->
    <div class="mb-16 text-center">
      <h1 class="text-5xl font-bold text-zinc-900 mb-4 transform -rotate-1 font-hand">Developer Tools</h1>
      <p class="text-2xl text-zinc-600 font-hand">A collection of useful tools for developers</p>
    </div>

    <!-- Tools Grid -->
    <div class="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="tool in tools"
        :key="tool.to"
        :to="tool.to"
        class="group sketch-card hover:sketch-shadow-hover transition-all duration-300 transform hover:-rotate-1"
      >
        <div class="p-2">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-bold text-zinc-800 group-hover:text-zinc-600 font-hand underline decoration-wavy decoration-zinc-200 group-hover:decoration-zinc-800">
              {{ tool.title }}
            </h2>
          </div>
          <p class="text-zinc-600 mb-6 text-lg h-24 overflow-hidden">{{ tool.description }}</p>
          <div class="flex flex-wrap gap-2 mb-4">
            <span
              v-for="tag in tool.tags"
              :key="tag.label"
              class="inline-flex items-center px-3 py-1 sketch-border-3 text-xs font-bold font-hand"
              :class="tag.color === 'green' ? 'bg-green-50 text-green-700' : 'bg-indigo-50 text-indigo-700'"
            >
              # {{ tag.label }}
            </span>
          </div>
          <div class="flex justify-end">
             <span class="font-hand font-bold text-zinc-800 group-hover:translate-x-1 transition-transform">Try it →</span>
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
    to: '/tools/typing',
    title: 'Typing Story Lab',
    description: 'Generate or paste English passages, clean the text, and practice with live typing stats.',
    tags: [
      { label: 'Typing Practice', color: 'indigo' },
      { label: 'AI-Powered', color: 'green' }
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
    to: '/tools/yuki',
    title: 'Yuki AI',
    description: 'A minimalist hand-drawn AI chat assistant powered by OpenRouter.',
    tags: [
      { label: 'AI Chat', color: 'indigo' },
      { label: 'Hand-drawn', color: 'green' }
    ]
  },
  {
    to: '/tools/whiteboard',
    title: 'Whiteboard',
    description: 'A sketchy, hand-drawn whiteboard for your ideas and sketches.',
    tags: [
      { label: 'Tool', color: 'indigo' },
      { label: 'Drawing', color: 'green' }
    ]
  },
  {
    to: '/tools/rednote',
    title: 'Rednote Optimizer',
    description: 'AI-powered Xiaohongshu (Rednote) copy optimizer with built-in whiteboard and image generation.',
    tags: [
      { label: 'AI Copy', color: 'indigo' },
      { label: 'Social Media', color: 'green' }
    ]
  },
  {
    to: '/tools/storyboard',
    title: 'Storyboard Generator',
    description: 'Generate storyboard panels, editable comic-style image prompts, and per-panel reference-based renders.',
    tags: [
      { label: 'Storyboard', color: 'indigo' },
      { label: 'AI Visuals', color: 'green' }
    ]
  },
]
</script>

<style scoped>
/* 工具卡片复用样式，已在组件内 V-for 渲染 */
</style> 
