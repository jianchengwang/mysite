<template>
  <div class="flex flex-col lg:flex-row gap-8 max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <article class="flex-1 min-w-0 max-w-4xl w-full sketch-card bg-white relative">
      <div class="p-4 md:p-8">
        <div class="pb-8 mb-8 border-b-2 border-zinc-900 text-center relative">
          <h1 class="text-4xl md:text-5xl font-bold text-zinc-900 mb-4 font-hand transform -rotate-1">{{ (doc as any).title }}</h1>
          <button class="markdown-theme-btn sketch-border-3 w-10 h-10 flex items-center justify-center hover:bg-zinc-100" @click="showThemePanel = !showThemePanel" aria-label="Markdown theme settings">
            <span class="icon-dots leading-none -mt-2 text-zinc-800">...</span>
          </button>
          <div v-if="showThemePanel" class="markdown-theme-panel sketch-border-2">
            <div v-for="theme in themes" :key="theme.value" @click="setTheme(theme.value)" :class="{active: theme.value === currentTheme}">
              {{ theme.label }}
            </div>
          </div>
        </div>
        <div :class="['prose max-w-none', currentTheme, 'font-sans text-xl leading-relaxed']">
          <ContentRenderer :value="doc" />
        </div>
        <div class="mt-12 flex flex-wrap gap-6 justify-center">
          <a v-if="(doc as any).link" :href="(doc as any).link" target="_blank" rel="noopener noreferrer"
            class="sketch-button bg-yellow-50 flex items-center">
            Visit Website
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
          </a>
          <NuxtLink v-if="!hideBack && backTo && backLabel" :to="backTo"
            class="sketch-button bg-blue-50">
            ← {{ backLabel }}
          </NuxtLink>
        </div>
      </div>
    </article>
    <aside class="lg:w-72 shrink-0">
      <TableOfContents class="TableOfContents sketch-border-2" :links="(doc as any).body?.toc?.links" />
    </aside>
    <button
      v-if="showTopBtn"
      class="back-to-top-btn sketch-border-3 sketch-shadow-sm"
      @click="scrollToTop"
      aria-label="Back to top"
    >
      ↑
    </button>
  </div>
</template>

<style scoped>
.TableOfContents {
  position: sticky;
  top: 100px;
  align-self: flex-start;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  z-index: 10;
  background: #fff;
  padding: 20px 16px;
  min-width: 240px;
}
.back-to-top-btn {
  position: fixed;
  right: 32px;
  bottom: 48px;
  z-index: 50;
  background: #fff;
  color: #18181b;
  width: 50px;
  height: 50px;
  font-size: 1.8em;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.back-to-top-btn:hover {
  transform: translateY(-4px);
  @apply bg-zinc-50;
}
.markdown-theme-btn {
  position: absolute;
  top: 0px;
  right: 0px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}
.icon-dots {
  font-family: inherit;
  font-size: 1.5em;
  letter-spacing: 0.1em;
}
.markdown-theme-panel {
  position: absolute;
  top: 48px;
  right: 0;
  background: #fff;
  min-width: 120px;
  z-index: 100;
  padding: 8px 0;
  overflow: hidden;
}
.markdown-theme-panel > div {
  padding: 8px 20px;
  cursor: pointer;
  font-size: 1.1em;
  font-family: 'Patrick Hand', sans-serif;
  color: #18181b;
  transition: all 0.2s;
}
.markdown-theme-panel > div.active,
.markdown-theme-panel > div:hover {
  background: #f4f4f5;
  @apply font-bold;
}
</style>

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