<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="flex gap-8">
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

          <!-- Action Buttons -->
          <div class="mt-8 flex gap-4 justify-center">
            <a v-if="doc.link" :href="doc.link" target="_blank" rel="noopener noreferrer"
              class="inline-flex items-center px-6 py-3 border border-zinc-300 text-base font-medium rounded-md text-zinc-800 bg-zinc-100 hover:bg-zinc-200 transition-colors">
              Visit Website
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                <path
                  d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
            </a>
            <NuxtLink to="/tech"
              class="inline-flex items-center px-6 py-3 border border-zinc-300 text-base font-medium rounded-md text-zinc-600 bg-white hover:bg-zinc-50 transition-colors">
              Back to Tech
            </NuxtLink>
          </div>
        </div>
      </article>
      <!-- Right TOC -->
      <nav class="hidden xl:block xl:w-64">
        <div class="sticky top-24 bg-zinc-50 p-6 rounded-lg border border-zinc-200">
          <p class="font-medium text-sm text-zinc-900 mb-4">On this page</p>
          <ul class="space-y-3 text-sm">
            <li v-for="link in doc.body.toc.links" :key="link.id">
              <a :href="'#' + link.id" class="block py-1 text-zinc-600 hover:text-zinc-900 transition-colors"
                :class="{ 'text-zinc-900 font-medium': $route.hash === '#' + link.id }">
                {{ link.text }}
              </a>
              <ul v-if="link.children" class="pl-4 mt-2 space-y-2 border-l border-zinc-200">
                <li v-for="child in link.children" :key="child.id">
                  <a :href="'#' + child.id" class="block py-1 text-zinc-500 hover:text-zinc-800 transition-colors"
                    :class="{ 'text-zinc-800 font-medium': $route.hash === '#' + child.id }">
                    {{ child.text }}
                  </a>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { data: doc } = await useAsyncData(route.path, () => {
  return queryCollection('tech').path(route.path).first()
})
definePageMeta({
  layout: 'article'
})
</script>