<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <article class="prose prose-indigo lg:prose-lg mx-auto">
      <ContentRenderer v-if="doc" :value="doc" />
    </article>
  </div>
</template>

<script setup lang="ts">
const { data: doc } = await useAsyncData(() => queryCollection('about').first())
definePageMeta({
  layout: 'default'
})
</script>