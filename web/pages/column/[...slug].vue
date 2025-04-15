<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="flex gap-4">
      <article class="flex-1 min-w-0 bg-zinc-50 rounded-lg border border-zinc-200 overflow-hidden">
        <!-- Content -->
        <div class="p-8">
          <div class="p-8 border-b border-zinc-200 text-center">
            <h1 class="text-3xl font-bold text-zinc-900 mb-4">{{ doc.title }}</h1>
          </div>

          <!-- Description -->
          <div class="prose prose-zinc lg:prose-lg max-w-none">
            <ContentRenderer :value="doc" />
          </div>
        </div>
      </article>
      <!-- Right TOC -->
      <TableOfContents :links="doc.body.toc.links" />

    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { data: doc } = await useAsyncData(route.path, () => {
  return queryCollection('column').path(route.path).first()
})
definePageMeta({
  layout: 'docs'
})
</script>