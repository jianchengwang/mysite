<template>
  <header class="bg-white border-b-2 border-zinc-900 sticky top-0 z-50">
    <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
      <NuxtLink to="/" class="text-2xl sm:text-3xl font-bold font-hand text-zinc-900 hover:text-zinc-700 transition-colors">
        JianchengWang
      </NuxtLink>

      <div class="flex items-center gap-3 sm:gap-6">
        <button
          @click="showMobileMenu = true"
          class="flex h-11 w-11 items-center justify-center rounded-[16px_8px_18px_7px/7px_18px_7px_16px] border-2 border-zinc-900 bg-white text-zinc-700 shadow-[2px_2px_0_0_rgba(0,0,0,1)] md:hidden"
          title="Open navigation"
          aria-label="Open navigation menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>
        </button>
        <div class="hidden md:flex items-center space-x-6">
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
        </div>
        <button
          @click="openSettings"
          class="sketch-button !px-3 !py-2 !shadow-[2px_2px_0_0_rgba(0,0,0,1)] !rounded-[16px_8px_18px_7px/7px_18px_7px_16px] text-zinc-700 hover:text-zinc-900 bg-white"
          title="Global Settings"
          aria-label="Open global settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        </button>
      </div>
    </nav>

    <!-- Settings Modal -->
    <Teleport to="body">
      <div v-if="showMobileMenu" class="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm md:hidden" @click.self="showMobileMenu = false">
        <div class="ml-auto flex h-full w-[86vw] max-w-sm flex-col border-l-2 border-zinc-900 bg-white p-5 shadow-[-8px_0_0_0_rgba(0,0,0,1)]">
          <div class="mb-5 flex items-center justify-between">
            <div>
              <p class="text-xs uppercase tracking-[0.18em] text-zinc-500">Navigation</p>
              <p class="text-2xl font-bold text-zinc-900 font-hand">Menu</p>
            </div>
            <button @click="showMobileMenu = false" class="text-3xl leading-none hover:text-zinc-500">×</button>
          </div>

          <div class="flex flex-col gap-2">
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="rounded-2xl border-2 border-zinc-900 bg-white px-4 py-3 text-lg font-medium text-zinc-800 shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              @click="showMobileMenu = false"
            >
              {{ item.label }}
            </NuxtLink>
          </div>

          <button
            @click="openSettings(); showMobileMenu = false"
            class="mt-auto sketch-button !bg-zinc-900 !text-white py-3"
          >
            Global Settings
          </button>
        </div>
      </div>

      <div v-if="showSettings" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm font-hand" @click.self="showSettings = false">
        <div class="sketch-card bg-white w-full max-w-md p-4 sm:p-6 space-y-4">
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

          <div class="space-y-2">
            <label class="block font-bold">WeChat MP AppID</label>
            <input
              v-model="wechatMpAppId"
              type="text"
              placeholder="wx1234567890abcdef"
              class="w-full p-3 sketch-border bg-white outline-none"
            />
            <p class="text-xs text-zinc-500 italic">Used by MD to WeChat when saving drafts to your official account.</p>
          </div>

          <div class="space-y-2">
            <label class="block font-bold">WeChat MP AppSecret</label>
            <input
              v-model="wechatMpAppSecret"
              type="password"
              placeholder="公众号 AppSecret"
              class="w-full p-3 sketch-border bg-white outline-none"
            />
          </div>
          
          <div class="flex flex-col gap-3 pt-4 sm:flex-row">
            <button
              @click="clearSettings"
              class="sketch-button py-2 px-4 bg-white text-red-600 sm:w-auto"
            >
              Clear
            </button>
            <button 
              @click="showSettings = false" 
              class="flex-1 sketch-button py-2 px-4 bg-white text-zinc-900"
            >
              Cancel
            </button>
            <button 
              @click="saveSettings" 
              class="flex-1 sketch-button py-2 px-4 !bg-zinc-900 !text-white"
            >
              Save
            </button>
          </div>
          <p v-if="savedHint" class="text-xs text-green-700 font-bold">{{ savedHint }}</p>
        </div>
      </div>
    </Teleport>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
const route = useRoute()

const showSettings = ref(false)
const showMobileMenu = ref(false)
const openRouterKey = ref('')
const wechatMpAppId = ref('')
const wechatMpAppSecret = ref('')
const savedHint = ref('')
const STORAGE_KEY = 'global_openrouter_key'
const WECHAT_MP_APP_ID_STORAGE_KEY = 'global_wechat_mp_app_id'
const WECHAT_MP_APP_SECRET_STORAGE_KEY = 'global_wechat_mp_app_secret'
const navItems = [
  { to: '/tech', label: 'Tech' },
  { to: '/store', label: 'Store' },
  { to: '/column', label: 'Column' },
  { to: '/english', label: 'English' },
  { to: '/tools', label: 'Tools' },
  { to: '/links', label: 'Links' },
  { to: '/about', label: 'About' }
]

const syncKeyFromStorage = () => {
  openRouterKey.value = localStorage.getItem(STORAGE_KEY) || ''
  wechatMpAppId.value = localStorage.getItem(WECHAT_MP_APP_ID_STORAGE_KEY) || ''
  wechatMpAppSecret.value = localStorage.getItem(WECHAT_MP_APP_SECRET_STORAGE_KEY) || ''
}

onMounted(() => {
  syncKeyFromStorage()
  window.addEventListener('open-global-settings', openSettings as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('open-global-settings', openSettings as EventListener)
})

watch(() => route.fullPath, () => {
  showMobileMenu.value = false
})

const openSettings = () => {
  syncKeyFromStorage()
  showSettings.value = true
  savedHint.value = ''
}

const saveSettings = () => {
  const key = openRouterKey.value.trim()
  const appId = wechatMpAppId.value.trim()
  const appSecret = wechatMpAppSecret.value.trim()
  localStorage.setItem(STORAGE_KEY, key)
  localStorage.setItem(WECHAT_MP_APP_ID_STORAGE_KEY, appId)
  localStorage.setItem(WECHAT_MP_APP_SECRET_STORAGE_KEY, appSecret)
  window.dispatchEvent(new CustomEvent('global-openrouter-key-updated', { detail: { key } }))
  window.dispatchEvent(new CustomEvent('global-wechat-mp-settings-updated', { detail: { appId, appSecret } }))
  window.dispatchEvent(new Event('storage'))
  savedHint.value = 'Saved'
  setTimeout(() => {
    savedHint.value = ''
  }, 1200)
  showSettings.value = false
}

const clearSettings = () => {
  openRouterKey.value = ''
  wechatMpAppId.value = ''
  wechatMpAppSecret.value = ''
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(WECHAT_MP_APP_ID_STORAGE_KEY)
  localStorage.removeItem(WECHAT_MP_APP_SECRET_STORAGE_KEY)
  window.dispatchEvent(new CustomEvent('global-openrouter-key-updated', { detail: { key: '' } }))
  window.dispatchEvent(new CustomEvent('global-wechat-mp-settings-updated', { detail: { appId: '', appSecret: '' } }))
  showSettings.value = false
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
