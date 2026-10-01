import { computed, onMounted, onUnmounted } from 'vue'
import { useState } from '#imports'

const STORAGE = 'global_backend_access_key'
export const useGlobalWechatDraftAccess = () => {
  const backendKey = useState<string>('global-backend-access-key', () => '')
  const syncConfig = () => {
    if (!import.meta.client) return
    // Discard obsolete browser-held WeChat tokens and persistent API keys.
    localStorage.removeItem('global_wechat_access_token')
    localStorage.removeItem(STORAGE)
    backendKey.value = sessionStorage.getItem(STORAGE) || ''
  }
  const hasBackendKey = computed(() => backendKey.value.trim().length >= 32)
  const openGlobalSettings = () => {
    if (import.meta.client) window.dispatchEvent(new Event('open-global-settings'))
  }
  onMounted(() => {
    syncConfig()
    window.addEventListener('global-wechat-draft-access-updated', syncConfig)
  })
  onUnmounted(() => window.removeEventListener('global-wechat-draft-access-updated', syncConfig))
  return { backendKey, hasBackendKey, syncConfig, openGlobalSettings }
}
