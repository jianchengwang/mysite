<template>
  <div :class="['article-frame', { 'novel-reading-frame': novel, 'reader-preferences-frame': unifiedReader }, unifiedReader ? 'reader-' + theme : '']" :style="unifiedReader ? { '--reading-size': fontSize + 'px' } : undefined">
    <article v-if="doc" class="reading-article">
      <nav class="article-breadcrumb" :aria-label="novel ? '阅读路径' : 'Breadcrumb'"><NuxtLink to="/">{{ novel ? '首页' : 'Home' }}</NuxtLink><template v-if="collection !== 'about' && collection !== 'links'"><span aria-hidden="true">/</span><NuxtLink :to="'/' + collection">{{ novel ? '故事' : displayTitle(collection) }}</NuxtLink><template v-if="seriesTitle && seriesPath"><span aria-hidden="true">/</span><NuxtLink :to="seriesPath">{{ seriesTitle }}</NuxtLink></template></template></nav>
      <header class="article-heading"><p class="eyebrow">{{ seriesTitle || collection }}<template v-if="contentDate(doc)"> · {{ contentDate(doc) }}</template></p><h1>{{ heading || displayTitle((doc as any).title) }}</h1>
        <ReaderSettings v-if="unifiedReader" :fontSize="fontSize" :theme="theme" @resize="resize" @theme="setTheme" />
        <details v-else class="reading-settings"><summary>Reading style</summary><div><button v-for="style in styles" :key="style.value" :aria-pressed="currentStyle === style.value" @click="currentStyle = style.value">{{ style.label }}</button></div></details>
      </header>
      <details v-if="tocLinks.length" class="mobile-toc"><summary>{{ unifiedReader ? '本章小节' : 'On this page' }}</summary><TableOfContents :links="tocLinks" /></details>
      <slot name="before-content" /><div :class="['article-body prose', unifiedReader ? (novel ? '' : 'prose-github') : currentStyle]"><ContentRenderer :value="renderedDoc" /></div>
      <slot name="after-content" /><div class="article-end"><a v-if="(doc as any).link" :href="(doc as any).link" target="_blank" rel="noopener noreferrer" class="primary-link">Visit website ↗</a><NuxtLink v-if="!hideBack && backTo && backLabel" :to="backTo" class="text-link">← {{ backLabel }}</NuxtLink></div>
    </article>
    <aside v-if="tocLinks.length" class="article-toc"><TableOfContents :links="tocLinks" /></aside>
    <button v-if="showTopBtn" class="back-to-top icon-button" :aria-label="novel ? '回到顶部' : 'Back to top'" @click="scrollToTop">↑</button>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { contentDate, displayTitle } from '~/utils/contentPresentation'
import { novelReadingDocument } from '~/utils/novelParagraphs.mjs'
const props = defineProps<{ collection: string; backTo?: string; backLabel?: string; hideBack?: boolean; heading?: string; seriesTitle?: string; seriesPath?: string; novel?: boolean }>()
const unifiedReader = computed(() => props.collection === 'column' || props.collection === 'store')
const { fontSize, theme, resize, setTheme } = useReaderPreferences()
const route = useRoute()
const articlePath = route.path.replace(/\/+$/, '') || '/'
const { data: doc } = await useAsyncData('article:' + props.collection + ':' + articlePath, () => (queryCollection(props.collection as any) as any).path(articlePath).first())
if (!doc.value) throw createError({ statusCode: 404, statusMessage: 'Article not found' })
const tocLinks = computed(() => (doc.value as any)?.body?.toc?.links || [])
const renderedDoc = computed(() => props.novel ? novelReadingDocument(doc.value) : doc.value)
const styles = [{ value: 'prose-github', label: 'GitHub' }, { value: 'prose-notion', label: 'Notion' }, { value: 'prose-jianshu', label: 'Jianshu' }]
const currentStyle = ref('prose-github')
const showTopBtn = ref(false)
const handleScroll = () => { showTopBtn.value = window.scrollY > 600 }
const scrollToTop = () => { window.scrollTo({ top: 0, behavior: 'smooth' }) }
onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
})
onUnmounted(() => { window.removeEventListener('scroll', handleScroll) })
</script>
