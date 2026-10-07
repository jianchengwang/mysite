<template>
  <section class="series-directory">
    <header class="page-heading"><p class="eyebrow">{{ series.section === 'store' ? '小说合集' : '知识专题' }} · {{ series.availableEntries.length < series.count ? series.availableEntries.length : (series.count || series.expectedEntries) }}{{ series.section === 'store' ? '章' : '篇' }}</p><h1>{{ series.title }}</h1><p class="page-subtitle">{{ series.summary }}</p><p v-if="series.introduction" class="page-subtitle">{{ series.introduction }}</p>
      <img v-if="series.cover" class="series-cover" :src="series.cover" :alt="series.title + '封面'" width="900" height="500" />
      <div v-if="first" class="series-start"><NuxtLink :to="first.path" class="primary-link">开始阅读 <span aria-hidden="true">↗</span></NuxtLink><span>{{ series.groups.length }}{{ series.section === 'store' ? '卷' : '个部分' }} · {{ series.availableEntries.length }}{{ series.section === 'store' ? '章' : '篇' }}可读</span></div>
    </header>
    <p v-if="series.plannedEntries && series.availableEntries.length < series.plannedEntries" class="preview-notice">更新中 · 已提供 {{ series.availableEntries.length }} / {{ series.plannedEntries }} 篇全文，其余篇目标明规划，完成后再开放正文。</p>
    <p v-if="!series.count" class="series-empty">目录与正文待权威内容包接入。</p>
    <section v-for="group in series.groups" :key="group.id" class="series-group" :aria-labelledby="'group-' + group.id">
      <header><h2 :id="'group-' + group.id">{{ group.title }}</h2><span>{{ group.entries.length }}{{ series.section === 'store' ? '章' : '篇' }}</span></header><p v-if="group.description" class="page-subtitle">{{ group.description }}</p>
      <ol class="series-entries">
        <li v-for="entry in group.entries" :key="entry.path">
          <NuxtLink v-if="entry.available" :to="entry.path"><span class="series-number">{{ String(entry.number).padStart(2, '0') }}</span><div><strong>{{ entry.title }}</strong><p v-if="entry.description">{{ entry.description }}</p></div><span aria-hidden="true">↗</span></NuxtLink>
          <div v-else class="series-locked"><span class="series-number">{{ String(entry.number).padStart(2, '0') }}</span><strong>{{ entry.title }}</strong><span>{{ series.plannedEntries ? '规划中' : '未发布' }}</span></div>
        </li>
      </ol>
    </section>
    <section v-if="series.readingGuide" class="series-group"><h2>怎么读</h2><p class="page-subtitle">{{ series.readingGuide }}</p><p class="page-subtitle">{{ series.attribution }}</p></section>
  </section>
</template>
<script setup lang="ts">
const props = defineProps<{ series: any }>()
const first = computed(() => props.series.availableEntries[0])
useSeoMeta({ title: () => props.series.title + ' | JianchengWang', description: () => props.series.summary, ogTitle: () => props.series.title, ogDescription: () => props.series.summary, ogImage: () => props.series.cover || undefined })
const config = useRuntimeConfig()
useHead({ link: () => [{ rel: 'canonical', href: config.public.siteUrl + props.series.path }] })
</script>
