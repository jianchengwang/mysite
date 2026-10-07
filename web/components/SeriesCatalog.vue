<template>
  <section class="site-shell collection-page">
    <header class="page-heading"><p class="eyebrow">Collected reads</p><h1>{{ section === 'store' ? 'Store' : 'Column' }}</h1><p class="page-subtitle">{{ section === 'store' ? '故事汇成一本，慢慢读。' : '围绕一个主题，循序读下去。' }}</p></header>
    <div class="column-grid">
      <NuxtLink v-for="series in collections" :key="series.path" :to="series.catalogPath || series.path" class="column-card series-card">
        <img v-if="series.cover" :src="series.cover" :alt="series.title + '封面'" loading="lazy" width="640" height="360" />
        <span class="eyebrow">{{ section === 'store' ? '小说合集' : '知识专题' }} · {{ series.count || series.expectedEntries }}{{ section === 'store' ? '章' : '篇' }}</span>
        <h2>{{ series.title }}</h2><p>{{ series.summary }}</p><span class="entry-action">查看目录 <span aria-hidden="true">↗</span></span>
      </NuxtLink>
    </div>
    <p v-if="!collections.length" class="series-empty">合集正在整理，稍后见。</p>
  </section>
</template>
<script setup lang="ts">
const props = defineProps<{ section: 'column' | 'store' }>()
const { forSection, preview } = useSeriesCatalog()
const collections = computed(() => forSection(props.section))
useSeoMeta({ title: () => (props.section === 'store' ? 'Store' : 'Column') + ' | JianchengWang', description: () => props.section === 'store' ? '故事合集与小说目录。' : '知识专题与系列文章。' })
</script>

