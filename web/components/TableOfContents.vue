<template>
  <nav class="hidden lg:block">
    <div class="bg-white p-6 sketch-border-2">
      <p class="font-bold text-xl text-zinc-900 mb-4 font-hand underline decoration-zinc-300">On this page</p>
      <div class="max-h-[calc(100vh-16rem)] overflow-y-auto pr-2 custom-scrollbar">
        <ul class="space-y-3 text-lg font-hand">
          <li v-for="link in links" :key="link.id">
            <a :href="'#' + link.id" class="block py-1 text-zinc-700 hover:text-zinc-900 transition-all hover:translate-x-1"
              :class="{ 'text-zinc-900 font-bold underline': currentHash === '#' + link.id }">
              {{ link.text }}
            </a>
            <ul v-if="link.children && link.children.length > 0" class="pl-4 mt-2 space-y-2 border-l-2 border-zinc-200">
              <li v-for="child in link.children" :key="child.id">
                <a :href="'#' + child.id" class="block py-1 text-zinc-600 hover:text-zinc-800 transition-all hover:translate-x-1"
                  :class="{ 'text-zinc-800 font-bold underline': currentHash === '#' + child.id }">
                  - {{ child.text }}
                </a>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #d4d4d8;
  border-radius: 10px;
}
</style>

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