<template>
  <nav class="hidden xl:block xl:w-64">
    <div class="sticky top-24 bg-zinc-50 p-6 rounded-lg border border-zinc-200">
      <p class="font-medium text-sm text-zinc-900 mb-4">On this page</p>
      <div class="max-h-[calc(100vh-12rem)] overflow-y-auto">
        <ul class="space-y-3 text-sm">
          <li v-for="link in links" :key="link.id">
            <a :href="'#' + link.id" class="block py-1 text-zinc-600 hover:text-zinc-900 transition-colors"
              :class="{ 'text-zinc-900 font-medium': currentHash === '#' + link.id }">
              {{ link.text }}
            </a>
            <ul v-if="link.children" class="pl-4 mt-2 space-y-2 border-l border-zinc-200">
              <li v-for="child in link.children" :key="child.id">
                <a :href="'#' + child.id" class="block py-1 text-zinc-500 hover:text-zinc-800 transition-colors"
                  :class="{ 'text-zinc-800 font-medium': currentHash === '#' + child.id }">
                  {{ child.text }}
                </a>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

interface TocLink {
  id: string
  text: string
  children?: TocLink[]
}

const props = defineProps<{
  links: TocLink[]
}>()

const route = useRoute()
const currentHash = ref(route.hash)

const updateHash = () => {
  currentHash.value = window.location.hash
}

onMounted(() => {
  window.addEventListener('hashchange', updateHash)
})

onUnmounted(() => {
  window.removeEventListener('hashchange', updateHash)
})
</script> 