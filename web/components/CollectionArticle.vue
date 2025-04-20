<template>
  <div class="flex gap-8 max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <article class="flex-1 min-w-0 max-w-4xl w-full bg-zinc-50 rounded-lg border border-zinc-200 overflow-hidden relative">
      <div class="p-8">
        <div class="p-8 border-b border-zinc-200 text-center relative">
          <h1 class="text-3xl font-bold text-zinc-900 mb-4">{{ (doc as any).title }}</h1>
          <button class="markdown-theme-btn" @click="showThemePanel = !showThemePanel" aria-label="Markdown theme settings">
            <span class="icon-dots">···</span>
          </button>
          <div v-if="showThemePanel" class="markdown-theme-panel">
            <div v-for="theme in themes" :key="theme.value" @click="setTheme(theme.value)" :class="{active: theme.value === currentTheme}">
              {{ theme.label }}
            </div>
          </div>
        </div>
        <div :class="['prose', currentTheme]">
          <ContentRenderer :value="doc" />
        </div>
        <div class="mt-8 flex gap-4 justify-center">
          <a v-if="(doc as any).link" :href="(doc as any).link" target="_blank" rel="noopener noreferrer"
            class="inline-flex items-center px-6 py-3 border border-zinc-300 text-base font-medium rounded-md text-zinc-800 bg-zinc-100 hover:bg-zinc-200 transition-colors">
            Visit Website
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
          </a>
          <NuxtLink v-if="!hideBack && backTo && backLabel" :to="backTo"
            class="inline-flex items-center px-6 py-3 border border-zinc-300 text-base font-medium rounded-md text-zinc-600 bg-white hover:bg-zinc-50 transition-colors">
            {{ backLabel }}
          </NuxtLink>
        </div>
      </div>
    </article>
    <TableOfContents class="TableOfContents" :links="(doc as any).body?.toc?.links" />
    <button
      v-if="showTopBtn"
      class="back-to-top-btn"
      @click="scrollToTop"
      aria-label="Back to top"
    >
      ↑
    </button>
  </div>
</template>

<script setup lang="ts">
import { defineProps, ref, onMounted, onUnmounted } from 'vue'
const props = defineProps({
  collection: { type: String, required: true },
  backTo: { type: String, required: false },
  backLabel: { type: String, required: false },
  hideBack: { type: Boolean, default: false }
})
const route = useRoute()
const { data: doc } = await useAsyncData(route.path, () => {
  return (queryCollection(props.collection as any) as any).path(route.path).first()
})
definePageMeta({
  layout: 'article'
})
// 回到顶部按钮逻辑
const showTopBtn = ref(false)
const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
const handleScroll = () => {
  showTopBtn.value = window.scrollY > 300
}
onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
// Markdown 主题切换逻辑
const themes = [
  { value: 'prose-github', label: 'GitHub' },
  { value: 'prose-notion', label: 'Notion' },
  { value: 'prose-jianshu', label: 'Jianshu' }
]
const currentTheme = ref('prose-github')
const showThemePanel = ref(false)
function setTheme(theme) {
  currentTheme.value = theme
  showThemePanel.value = false
}
</script>

<style scoped>
.TableOfContents {
  position: sticky;
  top: 80px; /* 视实际header高度调整 */
  align-self: flex-start;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  z-index: 10;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  padding: 16px 12px;
  min-width: 240px;
  max-width: 300px;
}
.back-to-top-btn {
  position: fixed;
  right: 32px;
  bottom: 48px;
  z-index: 50;
  background: #fff;
  color: #222;
  border: 1px solid #e5e7eb;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  font-size: 1.5em;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  cursor: pointer;
  opacity: 0.85;
  transition: opacity 0.2s, background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.back-to-top-btn:hover {
  opacity: 1;
  background: #f3f4f6;
  color: #111;
  border-color: #d1d5db;
}
.markdown-theme-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  color: #bbb;
  font-size: 1.5em;
  cursor: pointer;
  padding: 0 4px;
  border-radius: 50%;
  transition: background 0.2s, color 0.2s;
}
.markdown-theme-btn:hover {
  background: #f3f4f6;
  color: #222;
}
.icon-dots {
  font-family: inherit;
  font-size: 1.5em;
  letter-spacing: 0.2em;
}
.markdown-theme-panel {
  position: absolute;
  top: 44px;
  right: 0;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  min-width: 100px;
  z-index: 100;
  padding: 6px 0;
}
.markdown-theme-panel > div {
  padding: 6px 18px;
  cursor: pointer;
  font-size: 1em;
  color: #444;
  transition: background 0.2s, color 0.2s;
}
.markdown-theme-panel > div.active,
.markdown-theme-panel > div:hover {
  background: #f3f4f6;
  color: #111;
}
</style> 