import { onMounted, onUnmounted } from 'vue'
import { useState } from '#imports'

const GLOBAL_KEY_STORAGE = 'global_openrouter_key'

export const useGlobalOpenRouterKey = () => {
  const apiKey = useState<string>('global-openrouter-key', () => '')

  const syncApiKey = () => {
    if (!import.meta.client) return
    apiKey.value = localStorage.getItem(GLOBAL_KEY_STORAGE) || ''
  }

  const openGlobalSettings = () => {
    if (!import.meta.client) return
    window.dispatchEvent(new Event('open-global-settings'))
  }

  onMounted(() => {
    syncApiKey()
    window.addEventListener('storage', syncApiKey)
    window.addEventListener('global-openrouter-key-updated', syncApiKey as EventListener)
  })

  onUnmounted(() => {
    window.removeEventListener('storage', syncApiKey)
    window.removeEventListener('global-openrouter-key-updated', syncApiKey as EventListener)
  })

  return {
    apiKey,
    syncApiKey,
    openGlobalSettings
  }
}
