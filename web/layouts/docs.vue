<template>
  <div class="site-layout"><Header />
    <div class="docs-mobile-toolbar"><span>Cloud Native</span><button class="text-link" aria-controls="docs-chapter-dialog" :aria-expanded="sidebarOpen" @click="openSidebar">目录 <span aria-hidden="true">☰</span></button></div>
    <div class="docs-shell">
      <aside class="docs-sidebar"><div class="docs-sidebar-inner"><NuxtLink to="/column" class="text-link">← 全部专题</NuxtLink><p class="eyebrow">Cloud Native</p><ChapterNavigation :items="chapters" /></div></aside>
      <main id="main-content" class="docs-main"><slot /></main>
    </div><Footer />
    <dialog id="docs-chapter-dialog" ref="sidebar" class="site-dialog chapter-dialog" aria-labelledby="chapter-title" @click.self="closeSidebar" @close="sidebarOpen = false"><div class="dialog-panel"><div class="dialog-heading"><div><p class="eyebrow">Cloud Native</p><h2 id="chapter-title">阅读目录</h2></div><button class="icon-button" aria-label="关闭目录" @click="closeSidebar">×</button></div><ChapterNavigation :items="chapters" /></div></dialog>
  </div>
</template>
<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
interface NavigationItem { title: string; path?: string; children?: NavigationItem[] }
const route = useRoute()
const sectionRoot = computed(() => '/' + route.path.split('/').filter(Boolean).slice(0, 2).join('/'))
const { data: navigation } = await useAsyncData<NavigationItem[]>('column-chapter-navigation', () => queryCollectionNavigation('column').where('path', 'LIKE', sectionRoot.value + '/%'))
const chapters = computed(() => navigation.value?.[0]?.children?.[0]?.children || [])
const sidebar = ref<HTMLDialogElement | null>(null)
const sidebarOpen = ref(false)
const openSidebar = () => { sidebar.value?.showModal(); sidebarOpen.value = true }
const closeSidebar = () => { sidebar.value?.close(); sidebarOpen.value = false }
watch(() => route.path, closeSidebar)
watch(sidebarOpen, (open) => { document.body.style.overflow = open ? 'hidden' : '' })
onUnmounted(() => { if (sidebarOpen.value) document.body.style.overflow = '' })
</script>
