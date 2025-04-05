<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="flex gap-8">
      <article class="prose prose-indigo lg:prose-lg mx-auto">
        <ContentRenderer v-if="doc" :value="doc" />
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

<script setup>
import { ref, computed } from 'vue'
const route = useRoute()

const { data: doc } = await useAsyncData(() => queryCollection('tools').path(route.path).first())
definePageMeta({
  layout: 'default'
})
</script>