<template>
  <div class="site-layout"><Header />
    <div v-if="current" class="docs-mobile-toolbar"><NuxtLink :to="current.series.path" class="series-toolbar-title">{{ current.series.title }}</NuxtLink><button class="text-link" aria-controls="series-chapter-dialog" :aria-expanded="sidebarOpen" @click="openSidebar">目录 <span aria-hidden="true">☰</span></button></div>
    <div class="docs-shell">
      <aside v-if="current" class="docs-sidebar"><div class="docs-sidebar-inner"><NuxtLink :to="'/' + current.series.section" class="text-link">← {{ current.series.section === 'store' ? '全部故事' : '全部专题' }}</NuxtLink><p class="eyebrow">{{ current.series.title }}</p><NuxtLink :to="current.series.path" class="series-directory-link">合集目录</NuxtLink><ChapterNavigation :items="chapters" /></div></aside>
      <main id="main-content" class="docs-main"><slot /></main>
    </div><Footer />
    <dialog id="series-chapter-dialog" ref="sidebar" class="site-dialog chapter-dialog" aria-labelledby="series-chapter-title" @click.self="closeSidebar" @close="sidebarOpen = false"><div class="dialog-panel"><div class="dialog-heading"><div><p class="eyebrow">{{ current?.series.title }}</p><h2 id="series-chapter-title">阅读目录</h2></div><button class="icon-button" aria-label="关闭目录" @click="closeSidebar">×</button></div><NuxtLink v-if="current" :to="current.series.path" class="series-directory-link" @click="closeSidebar">返回合集目录</NuxtLink><ChapterNavigation :items="chapters" /></div></dialog>
  </div>
</template>
<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { navigationForSeries } from '~/utils/seriesCatalog.mjs'
const { current, preview } = useSeriesCatalog()
const route = useRoute()
const chapters = computed(() => current.value ? navigationForSeries(current.value.series) : [])
const sidebar = ref<HTMLDialogElement | null>(null)
const sidebarOpen = ref(false)
const openSidebar = () => { sidebar.value?.showModal(); sidebarOpen.value = true }
const closeSidebar = () => { sidebar.value?.close(); sidebarOpen.value = false }
watch(() => route.path, closeSidebar)
watch(sidebarOpen, (open) => { document.body.style.overflow = open ? 'hidden' : '' })
onUnmounted(() => { if (sidebarOpen.value) document.body.style.overflow = '' })
</script>

