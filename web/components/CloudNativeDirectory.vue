<template>
  <section class="series-directory cloudnative-directory">
    <header class="page-heading">
      <p class="eyebrow">知识专题 · {{ series.count }}篇</p>
      <h1>{{ series.title }}</h1>
      <p class="page-subtitle">{{ series.summary }}</p>
      <picture class="cloudnative-cover">
        <source media="(max-width: 767px)" srcset="/collections-assets/cloudnative/cloud-native-cover-portrait.png" width="1200" height="1600" />
        <img :src="series.cover" :alt="series.title + '封面'" width="1600" height="900" />
      </picture>
      <div v-if="first" class="series-start"><NuxtLink :to="first.path" class="primary-link">开始阅读 <span aria-hidden="true">↗</span></NuxtLink><span>{{ series.groups.length }}个部分 · {{ series.availableEntries.length }}篇可读</span></div>
    </header>
    <div v-if="intro" class="article-body prose prose-github cloudnative-guide"><ContentRenderer :value="intro" /></div>
  </section>
</template>
<script setup lang="ts">
const props = defineProps<{ series: any }>()
const first = computed(() => props.series.availableEntries[0])
const { data: intro } = await useAsyncData('cloudnative-intro', () => queryCollection('cloudnativeIntro').first())
if (!intro.value) throw createError({ statusCode: 404, statusMessage: 'Collection introduction not found' })
useSeoMeta({ title: () => props.series.title + ' | JianchengWang', description: () => props.series.summary, ogTitle: () => props.series.title, ogDescription: () => props.series.summary, ogImage: () => props.series.cover })
const config = useRuntimeConfig()
useHead({ link: () => [{ rel: 'canonical', href: config.public.siteUrl + props.series.path }] })
</script>
<style scoped>
.cloudnative-cover{display:block;margin:26px 0}
.cloudnative-cover img{display:block;max-width:100%;height:auto;border-radius:6px}
.cloudnative-guide{margin-top:38px;font-size:17px;line-height:1.9;overflow-wrap:anywhere}
.cloudnative-guide :deep(h2){scroll-margin-top:90px}
@media(max-width:767px){.cloudnative-cover img{width:auto;max-height:440px;margin:0 auto}.cloudnative-guide{font-size:16px}}
</style>
