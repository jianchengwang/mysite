<template>
  <div :class="['serial-reader', { 'novel-reader': isNovel }]">
    <CollectionArticle :key="entry.path" :collection="series.section" :heading="entry.title" :seriesTitle="series.title" :seriesPath="series.path" :novel="isNovel" hideBack>
      <template #before-content>
        <img v-if="entry.cover" class="serial-cover" :src="entry.cover" :alt="entry.title + '封面'" width="1880" height="800" />
        <div class="serial-reading-tools"><p>{{ entry.groupTitle }} · {{ entry.number }} / {{ series.count }}</p></div>
      </template>
      <template #after-content><SeriesPager :series="series" :entry="entry" /></template>
    </CollectionArticle>
    <TheoryFigureViewer :assetPrefix="'/collections-assets/' + series.id + '/'" v-if="series.section === 'column' && ['llm-to-agent-learning', 'cloudnative', 'math-beauty'].includes(series.id)" />
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ series: any; entry: any }>()
const isNovel = computed(() => props.series.section === 'store' && props.series.id === 'wenroudao-long')
useSeoMeta({ title: () => props.entry.title + ' · ' + props.series.title + ' | JianchengWang', description: () => props.entry.description || props.series.summary, ogTitle: () => props.entry.title, ogDescription: () => props.entry.description || props.series.summary, ogImage: () => props.entry.cover || props.series.cover || undefined })
const config = useRuntimeConfig()
useHead({ link: () => [{ rel: 'canonical', href: config.public.siteUrl + props.entry.path }] })
</script>
