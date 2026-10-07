<template>
  <section class="site-shell collection-page">
    <header class="page-heading"><p class="eyebrow">{{ title }} · {{ list.length }} entries</p><h1>{{ title }}</h1><p class="page-subtitle">{{ subtitle }}</p></header>
    <div class="entry-grid">
      <NuxtLink v-for="item in list" :key="item.path" :to="item.path" class="entry-card" :aria-label="'Read more about ' + item.title">
        <div><p v-if="contentDate(item)" class="entry-date">{{ contentDate(item) }}</p><h2>{{ displayTitle(item.title) }}</h2><p class="entry-excerpt">{{ item.description }}</p></div>
        <span class="entry-action">Read article <span aria-hidden="true">↗</span></span>
      </NuxtLink>
    </div>
  </section>
</template>
<script setup lang="ts">
import { contentDate, displayTitle } from '~/utils/contentPresentation'
interface CollectionItem { path: string; title: string; description: string; meta?: Record<string, unknown> }
defineProps<{ title?: string; subtitle?: string; list: CollectionItem[] }>()
</script>
