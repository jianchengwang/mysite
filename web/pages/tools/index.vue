<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <!-- Page Header -->
    <div class="mb-12">
      <h1 class="text-4xl font-bold text-zinc-900 mb-4">Developer Tools</h1>
      <p class="text-lg text-zinc-600">A collection of useful tools for developers</p>
    </div>

    <!-- Tools Grid -->
    <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      <!-- English Chunk Generator -->
      <NuxtLink to="/tools/english-chunk" 
        class="group bg-white rounded-lg border border-zinc-200 hover:border-zinc-300 transition-all duration-200 overflow-hidden">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-zinc-800 group-hover:text-zinc-600">
              English Chunk Generator
            </h2>
            <i class="pi pi-arrow-right text-zinc-400 group-hover:text-zinc-600 transition-colors"></i>
          </div>
          <p class="text-zinc-600 mb-4">
            Generate common English chunks with example sentences for daily routines, work life, and more.
          </p>
          <div class="flex gap-2">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              AI-Powered
            </span>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Free
            </span>
          </div>
        </div>
      </NuxtLink>

      <!-- Live2D Talk -->
      <NuxtLink to="/tools/live2d" 
        class="group bg-white rounded-lg border border-zinc-200 hover:border-zinc-300 transition-all duration-200 overflow-hidden">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-zinc-800 group-hover:text-zinc-600">
              Live2D Talk
            </h2>
            <i class="pi pi-arrow-right text-zinc-400 group-hover:text-zinc-600 transition-colors"></i>
          </div>
          <p class="text-zinc-600 mb-4">
            Chat with a cute anime character.
          </p>
          <div class="flex gap-2">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Feature Tag
            </span>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Free
            </span>
          </div>
        </div>
      </NuxtLink>

      <!-- Prompt Collection -->
      <NuxtLink to="/tools/prompt-collection" 
        class="group bg-white rounded-lg border border-zinc-200 hover:border-zinc-300 transition-all duration-200 overflow-hidden">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-zinc-800 group-hover:text-zinc-600">
              Prompt Collection
            </h2>
            <i class="pi pi-arrow-right text-zinc-400 group-hover:text-zinc-600 transition-colors"></i>
          </div>
          <p class="text-zinc-600 mb-4">
            A collection of useful prompts for writing, coding, learning, and business.
          </p>
          <div class="flex gap-2">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Templates
            </span>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Free
            </span>
          </div>
        </div>
      </NuxtLink>

      <!-- Markdown to WeChat -->
      <NuxtLink to="/tools/md-to-wechat" 
        class="group bg-white rounded-lg border border-zinc-200 hover:border-zinc-300 transition-all duration-200 overflow-hidden">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-zinc-800 group-hover:text-zinc-600">
              Markdown To WeChat
            </h2>
            <i class="pi pi-arrow-right text-zinc-400 group-hover:text-zinc-600 transition-colors"></i>
          </div>
          <p class="text-zinc-600 mb-4">
            Convert Markdown documents to beautiful WeChat articles, with code highlighting, tables, and customizable themes.
          </p>
          <div class="flex gap-2">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Format Conversion
            </span>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Free
            </span>
          </div>
        </div>
      </NuxtLink>

      <NuxtLink to="/tools/qwerty" 
        class="group bg-white rounded-lg border border-zinc-200 hover:border-zinc-300 transition-all duration-200 overflow-hidden">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-zinc-800 group-hover:text-zinc-600">
              Qwerty
            </h2>
            <i class="pi pi-arrow-right text-zinc-400 group-hover:text-zinc-600 transition-colors"></i>
          </div>
          <p class="text-zinc-600 mb-4">
            Practice your typing skills with Qwerty.
          </p>
          <div class="flex gap-2">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Typing Practice 
            </span>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Free
            </span>
          </div>
        </div>
      </NuxtLink>

      <!-- Add more tools here as they are created -->
      <!-- Example template for future tools:
      <NuxtLink to="/tools/other-tool" 
        class="group bg-white rounded-lg border border-zinc-200 hover:border-zinc-300 transition-all duration-200 overflow-hidden">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-zinc-800 group-hover:text-zinc-600">
              Other Tool
            </h2>
            <i class="pi pi-arrow-right text-zinc-400 group-hover:text-zinc-600 transition-colors"></i>
          </div>
          <p class="text-zinc-600 mb-4">
            Description of the other tool and its features.
          </p>
          <div class="flex gap-2">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Feature Tag
            </span>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Free
            </span>
          </div>
        </div>
      </NuxtLink>
      -->
    </div>
  </div>
</template>

<script setup lang="ts">
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