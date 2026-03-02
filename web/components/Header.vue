<template>
  <header class="bg-white border-b-2 border-zinc-900 sticky top-0 z-50">
    <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
      <NuxtLink to="/" class="text-3xl font-bold font-hand text-zinc-900 hover:text-zinc-700 transition-colors">
        JianchengWang
      </NuxtLink>

      <div class="flex items-center space-x-6">
        <NuxtLink to="/tech" class="text-lg font-medium text-zinc-700 hover:text-zinc-900 sketch-nav-link" active-class="active">
          Tech
        </NuxtLink>
        <NuxtLink to="/store" class="text-lg font-medium text-zinc-700 hover:text-zinc-900 sketch-nav-link" active-class="active">
          Store
        </NuxtLink>
        <NuxtLink to="/column" class="text-lg font-medium text-zinc-700 hover:text-zinc-900 sketch-nav-link" active-class="active">
          Column
        </NuxtLink>
        <NuxtLink to="/english" class="text-lg font-medium text-zinc-700 hover:text-zinc-900 sketch-nav-link" active-class="active">
          English
        </NuxtLink>
        <NuxtLink to="/tools" class="text-lg font-medium text-zinc-700 hover:text-zinc-900 sketch-nav-link" active-class="active">
          Tools
        </NuxtLink>
        <NuxtLink to="/links" class="text-lg font-medium text-zinc-700 hover:text-zinc-900 sketch-nav-link" active-class="active">
          Links
        </NuxtLink>
        <NuxtLink to="/about" class="text-lg font-medium text-zinc-700 hover:text-zinc-900 sketch-nav-link" active-class="active">
          About
        </NuxtLink>
        <button @click="showSettings = true" class="text-zinc-700 hover:text-zinc-900 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        </button>
      </div>
    </nav>

    <!-- Settings Modal -->
    <Teleport to="body">
      <div v-if="showSettings" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm font-hand">
        <div class="sketch-card bg-white w-full max-w-md p-6 space-y-4">
          <div class="flex justify-between items-center mb-2">
            <h2 class="text-2xl font-bold">Global Settings</h2>
            <button @click="showSettings = false" class="text-2xl hover:text-zinc-500">×</button>
          </div>
          
          <div class="space-y-2">
            <label class="block font-bold">OpenRouter API Key</label>
            <input 
              v-model="openRouterKey" 
              type="password" 
              placeholder="sk-or-..." 
              class="w-full p-3 sketch-border bg-white outline-none"
            />
            <p class="text-xs text-zinc-500 italic">Used across all AI tools (Yuki, Whiteboard, etc.)</p>
          </div>
          
          <div class="flex gap-4 pt-4">
            <button 
              @click="showSettings = false" 
              class="flex-1 sketch-button py-2 bg-white text-zinc-900"
            >
              Cancel
            </button>
            <button 
              @click="saveSettings" 
              class="flex-1 sketch-button py-2 bg-zinc-900 text-white"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const showSettings = ref(false)
const openRouterKey = ref('')

onMounted(() => {
  openRouterKey.value = localStorage.getItem('global_openrouter_key') || ''
})

const saveSettings = () => {
  localStorage.setItem('global_openrouter_key', openRouterKey.value)
  showSettings.value = false
  // Optional: reload the page or dispatch an event if you want other components to react immediately
  window.dispatchEvent(new Event('storage'))
}
</script>

<style scoped>
.sketch-nav-link {
  @apply relative;
}

.sketch-nav-link::after {
  content: '';
  position: absolute;
  width: 0%;
  height: 2px;
  bottom: -4px;
  left: -2px;
  right: -2px;
  background-color: #18181b;
  transition: width 0.3s ease;
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
}

.sketch-nav-link:hover::after,
.sketch-nav-link.active::after {
  @apply w-full;
}

.sketch-nav-link.active {
  @apply text-zinc-900 font-bold;
}
</style>